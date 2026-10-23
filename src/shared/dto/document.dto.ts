import { z } from 'zod';

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const SaveDocumentInputSchema = z.object({
  name: z.string().regex(/\.(pdf|docx)$/i),
  bytes: z.instanceof(Uint8Array).refine((b) => b.length > 0 && b.length <= MAX_DOCUMENT_BYTES, 'document size out of range'),
});
export type SaveDocumentInput = z.infer<typeof SaveDocumentInputSchema>;
