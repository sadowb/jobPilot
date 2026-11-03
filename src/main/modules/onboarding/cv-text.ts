import { unzipSync } from 'fflate';
import { extractText, getDocumentProxy } from 'unpdf';

/** The agent prompt carries at most this much CV text; a 1 to 3 page CV is ~10k characters. */
export const CV_TEXT_MAX = 60_000;
const DOCX_ENTRY_MAX = 20 * 1024 * 1024;

// `&lt;`/`&gt;` stay as written: decoding them after the tag strip below could re-create markup (CodeQL js/incomplete-multi-character-sanitization). The text only feeds an LLM prompt, which reads them fine.
const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'" };
const decode = (text: string) =>
  text.replace(/&(amp|quot|apos);|&#(\d{1,6});/g, (match, name: string | undefined, code: string | undefined) => {
    if (name) return ENTITIES[name]!;
    const point = Math.min(Number(code), 0x10ffff);
    return point === 0x3c || point === 0x3e ? match : String.fromCodePoint(point);
  });

/** Plain text of a DOCX body. Only `word/document.xml` is inflated, and only if it declares a sane size (zip-bomb guard). */
export function docxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, {
    filter: (file) => file.name === 'word/document.xml' && file.originalSize <= DOCX_ENTRY_MAX,
  });
  const xml = files['word/document.xml'];
  if (!xml) throw new Error('Not a readable DOCX.');
  return decode(
    new TextDecoder()
      .decode(xml)
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]*>/g, ''),
  );
}

export async function pdfText(bytes: Uint8Array): Promise<string> {
  // unpdf transfers the buffer to its worker; hand it a copy so the caller's bytes stay usable.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** Magic bytes decide the format, not the file name the renderer sent. */
export async function cvText(bytes: Uint8Array): Promise<string> {
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isPdf && !isZip) throw new Error('Not a PDF or DOCX.');
  const text = (isPdf ? await pdfText(bytes) : docxText(bytes))
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < 40) throw new Error('No readable text in this file (a scanned CV needs OCR).');
  return text.slice(0, CV_TEXT_MAX);
}
