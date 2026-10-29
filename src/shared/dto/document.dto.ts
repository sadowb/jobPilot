import { z } from 'zod';

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

/** Leading bytes of the accepted types: PDF `%PDF-`, DOCX (zip) `PK\x03\x04`. */
const SIGNATURES = { pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], docx: [0x50, 0x4b, 0x03, 0x04] } as const;
export const MAX_SIGNATURE_BYTES = 5;

/** Extension alone is spoofable: also require the content to start with the type's signature. */
export function matchesDocumentSignature(name: string, head: Uint8Array): boolean {
  const ext = /\.(pdf|docx)$/i.exec(name)?.[1]?.toLowerCase() as keyof typeof SIGNATURES | undefined;
  return ext !== undefined && SIGNATURES[ext].every((byte, i) => head[i] === byte);
}

export const SaveDocumentInputSchema = z
  .object({
    name: z.string().regex(/\.(pdf|docx)$/i),
    bytes: z
      .instanceof(Uint8Array)
      .refine((b) => b.length > 0 && b.length <= MAX_DOCUMENT_BYTES, 'document size out of range'),
  })
  .refine(({ name, bytes }) => matchesDocumentSignature(name, bytes), 'file content does not match its type');
export type SaveDocumentInput = z.infer<typeof SaveDocumentInputSchema>;
