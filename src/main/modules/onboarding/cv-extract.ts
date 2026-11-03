import { extractText, getDocumentProxy } from 'unpdf';

/** Pure PDF-to-text extraction. It runs only inside `cv-worker.ts` (an Electron utility process), never in the main process. */
export async function extractCvText(bytes: Uint8Array): Promise<string> {
  // Magic bytes decide the format, not the file name the renderer sent.
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) throw new Error('Not a PDF.');
  try {
    // unpdf transfers the buffer to its worker; hand it a copy so the caller's bytes stay usable.
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    return (await extractText(pdf, { mergePages: true })).text;
  } catch {
    throw new Error('Not a readable PDF.');
  }
}
