import { unzipSync } from 'fflate';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

/** Pure file-to-text extraction. It runs only inside `cv-worker.ts` (an Electron utility process), never in the main process. */

const DOCX_ENTRIES_MAX = 2_000;
const DOCX_UNPACKED_MAX = 50 * 1024 * 1024;

/** Zip-bomb guard: reads the central directory only (the filter never asks for an entry to be inflated) and rejects absurd sizes. */
function assertSaneZip(bytes: Uint8Array): void {
  let entries = 0;
  let unpacked = 0;
  unzipSync(bytes, {
    filter: (file) => {
      entries += 1;
      unpacked += file.originalSize;
      if (entries > DOCX_ENTRIES_MAX || unpacked > DOCX_UNPACKED_MAX) throw new Error('Not a readable DOCX.');
      return false;
    },
  });
}

async function docxText(bytes: Uint8Array): Promise<string> {
  // mammoth parses the OOXML with a real XML parser and returns text only; no markup is stripped or rebuilt by hand.
  try {
    assertSaneZip(bytes);
    return (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  } catch {
    throw new Error('Not a readable DOCX.');
  }
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  // unpdf transfers the buffer to its worker; hand it a copy so the caller's bytes stay usable.
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    return (await extractText(pdf, { mergePages: true })).text;
  } catch {
    throw new Error('Not a readable PDF.');
  }
}

/** Magic bytes decide the format, not the file name the renderer sent. */
export async function extractCvText(bytes: Uint8Array): Promise<string> {
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isPdf && !isZip) throw new Error('Not a PDF or DOCX.');
  return isPdf ? pdfText(bytes) : docxText(bytes);
}
