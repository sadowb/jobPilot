/** Inbox contracts: what the owner reviews before anything is sent, and the questions a run could not answer. */
import { z } from 'zod';
import { AnswerSource } from './enums';
import { RunSummarySchema } from './run.dto';

export const MAX_ANSWER_CHARS = 10_000;
/** Display caps for the snapshot kept on an approval; the form hash always covers the full, uncapped form. */
export const MAX_SNAPSHOT_FIELDS = 300;
export const MAX_SNAPSHOT_VALUE_CHARS = 2_000;

/** One field as it stands in the live form, read back from the tab (not the agent's claim about it). */
export const FormFieldSchema = z.object({
  label: z.string().max(300),
  value: z.string().max(MAX_SNAPSHOT_VALUE_CHARS),
});
export type FormFieldDto = z.infer<typeof FormFieldSchema>;

/** Stored in `approval.summary`. */
export const ApprovalSummarySchema = z.object({
  fields: z.array(FormFieldSchema).max(MAX_SNAPSHOT_FIELDS),
  /** True when the form had more fields than `fields` holds. */
  truncated: z.boolean(),
  /** What the agent says it used, with where each answer came from. */
  answers: z.array(z.object({ fieldKey: z.string(), answer: z.string(), source: AnswerSource.schema })),
});
export type ApprovalSummary = z.infer<typeof ApprovalSummarySchema>;

const Job = {
  runId: z.ulid(),
  applicationId: z.ulid(),
  createdAt: z.number().int(),
  company: z.string(),
  title: z.string(),
  siteHost: z.string(),
};

export const ApprovalItemSchema = z.object({
  kind: z.literal('approval'),
  /** pending: waiting for the owner. submitting: approved, the click is being made; no further action possible. */
  state: z.enum(['pending', 'submitting']),
  approvalId: z.ulid(),
  ...Job,
  postingUrl: z.string(),
  /** First characters of the bound form hash, for display and support only. */
  formRef: z.string(),
  summary: ApprovalSummarySchema,
  /** The CV version pinned to this application. Browser tools cannot upload files yet, so this is not a claim it was attached. */
  cv: z.object({ name: z.string(), fileName: z.string(), mime: z.string(), sizeBytes: z.number().int() }).nullable(),
});
export type ApprovalItem = z.infer<typeof ApprovalItemSchema>;

export const QuestionNeededSchema = z.object({
  fieldKey: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
});
export type QuestionNeeded = z.infer<typeof QuestionNeededSchema>;

export const NeedsYouItemSchema = z.object({
  kind: z.literal('needs_you'),
  ...Job,
  /** Why the run stopped, when it was not a plain question (stuck, blocked, setup). */
  reason: z.string().nullable(),
  questions: z.array(QuestionNeededSchema),
  blockers: z.array(z.object({ kind: z.enum(['captcha', 'login', 'unsupported', 'other']), message: z.string() })),
});
export type NeedsYouItem = z.infer<typeof NeedsYouItemSchema>;

export const InboxEntrySchema = z.discriminatedUnion('kind', [ApprovalItemSchema, NeedsYouItemSchema]);
export type InboxEntry = z.infer<typeof InboxEntrySchema>;

/** The renderer sends the approval id only. The hash it binds to was fixed in main when the form was snapshotted. */
export const DecideApprovalSchema = z.object({ approvalId: z.ulid() }).strict();

export const AnswerRunSchema = z
  .object({
    runId: z.ulid(),
    answers: z
      .array(
        z
          .object({
            fieldKey: z.string().min(1).max(200),
            answer: z.string().trim().min(1).max(MAX_ANSWER_CHARS),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export type AnswerRunInput = z.infer<typeof AnswerRunSchema>;

/**
 * approve: submitting (hash matched, submit started) | form_changed (hash differed or could not be checked: nothing sent,
 * the form is being filled again for a fresh review) | already_decided (double click or stale card: nothing done).
 */
export const ApproveResultSchema = z.object({
  outcome: z.enum(['submitting', 'form_changed', 'already_decided']),
  run: RunSummarySchema,
});
export type ApproveResult = z.infer<typeof ApproveResultSchema>;
