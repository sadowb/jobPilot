import { z } from 'zod';

export const ClaudeApiKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/);
export const ClaudeKeyStatusSchema = z.discriminatedUnion('set', [
  z.object({ set: z.literal(false), last4: z.null() }),
  z.object({ set: z.literal(true), last4: z.string().length(4) }),
]);
export const ClaudeKeyTestSchema = z.enum(['ok', 'not_set', 'invalid', 'unreachable']);
export type ClaudeKeyStatus = z.infer<typeof ClaudeKeyStatusSchema>;
export type ClaudeKeyTest = z.infer<typeof ClaudeKeyTestSchema>;
