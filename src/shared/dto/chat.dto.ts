import { z } from 'zod';

export const MAX_CHAT_CHARS = 2000;

/** One line of a per-job thread or of Cap's pilot chat. `owner` is the person; `agent` is the agent or Cap. */
export const ChatMessageSchema = z.object({
  id: z.ulid(),
  role: z.enum(['owner', 'agent']),
  body: z.string(),
  createdAt: z.number().int(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/** Per-job thread: the application's own chat. */
export const JobChatSchema = z.object({ applicationId: z.ulid() }).strict();
export const SendJobChatSchema = z
  .object({ applicationId: z.ulid(), text: z.string().trim().min(1).max(MAX_CHAT_CHARS) })
  .strict();
export const SendCapChatSchema = z.object({ text: z.string().trim().min(1).max(MAX_CHAT_CHARS) }).strict();
export type SendJobChatInput = z.infer<typeof SendJobChatSchema>;
export type SendCapChatInput = z.infer<typeof SendCapChatSchema>;

/** What the model returns for one chat turn. `relays` are notes Cap passes to a job's agent for its next fill. */
export const CapReplySchema = z.object({
  reply: z.string().min(1).max(1500),
  relays: z.array(z.object({ applicationId: z.string(), note: z.string().min(1).max(500) })).max(3),
});
export const AgentReplySchema = z.object({ reply: z.string().min(1).max(1500) });
