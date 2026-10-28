import { z } from 'zod';

/** Owner-facing state of the on-demand Mnemosyne memory tool (ADR 0015). */
export const MemoryStatusSchema = z.object({
  state: z.enum(['not_installed', 'installing', 'ready', 'failed']),
  /** Human step while installing, e.g. "Downloading uv". */
  step: z.string().max(120).nullable(),
  /** Download progress 0-100 when known. */
  percent: z.number().int().min(0).max(100).nullable(),
  /** Short owner-facing reason when state is failed. */
  error: z.string().max(300).nullable(),
});
export type MemoryStatus = z.infer<typeof MemoryStatusSchema>;
