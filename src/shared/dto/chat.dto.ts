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

/** What the cheap follow-up step after Cap's streamed reply returns: notes Cap passes to a job's agent for its next fill. */
export const CapActionsSchema = z.object({
  relays: z.array(z.object({ applicationId: z.string(), note: z.string().min(1).max(500) })).max(3),
  /** Durable wishes about every job (not one job's note), which Cap saves for the owner to undo. */
  preferences: z
    .array(z.object({ kind: z.enum(['work_mode', 'locations', 'rule']), value: z.string().min(1).max(300) }))
    .max(3)
    .default([]),
});

/** A standing preference of the owner, applied to every job's fill. `work_mode` is remote, hybrid or onsite. */
export const PreferenceKindSchema = z.enum(['work_mode', 'locations', 'rule']);
export const PreferenceSchema = z
  .object({
    id: z.ulid(),
    kind: PreferenceKindSchema,
    value: z.string().trim().min(1).max(300),
    createdAt: z.number().int(),
  })
  .refine((p) => p.kind !== 'work_mode' || ['remote', 'hybrid', 'onsite'].includes(p.value), 'Unknown work mode');
export type Preference = z.infer<typeof PreferenceSchema>;
export const UndoActionSchema = z.object({ undoId: z.ulid() }).strict();

/** A chat is a job's thread (its application id) or Cap's pilot chat. */
export const ChatKeySchema = z.union([z.literal('cap'), z.ulid()]);
export type ChatKey = z.infer<typeof ChatKeySchema>;
export const ChatKeyInputSchema = z.object({ chatKey: ChatKeySchema }).strict();

/** Sending returns at once with the saved owner message; the reply then streams as `ChatEvent`s keyed by chat and reply id. */
export const SendChatResultSchema = z.object({ owner: ChatMessageSchema, replyId: z.ulid() });
export type SendChatResult = z.infer<typeof SendChatResultSchema>;

/** Something Cap did beside answering (shown as a chip under the reply). */
export const ChatActionSchema = z.object({
  kind: z.enum(['relay', 'preference']),
  label: z.string().max(200),
  /** Present when the owner can take the action back (a saved preference): the id `chat:undo` takes. */
  undoId: z.ulid().optional(),
});
export type ChatAction = z.infer<typeof ChatActionSchema>;

/** Main -> renderer while a reply is produced. `done` always ends a reply, also a failed or cancelled one. */
export const ChatEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('thinking'), chatKey: ChatKeySchema, replyId: z.ulid() }),
  z.object({ type: z.literal('delta'), chatKey: ChatKeySchema, replyId: z.ulid(), text: z.string().max(20_000) }),
  z.object({
    type: z.literal('done'),
    chatKey: ChatKeySchema,
    replyId: z.ulid(),
    /** Null when a cancelled reply had produced no text, so nothing was saved. */
    message: ChatMessageSchema.nullable(),
    outcome: z.enum(['ok', 'failed', 'cancelled']),
    /** Time from send to the first streamed token, for measuring fluency. */
    ttftMs: z.number().int().nonnegative().nullable(),
  }),
  z.object({
    type: z.literal('actions'),
    chatKey: ChatKeySchema,
    replyId: z.ulid(),
    actions: z.array(ChatActionSchema).max(10),
  }),
]);
export type ChatEvent = z.infer<typeof ChatEventSchema>;
