/** Closed value sets shared by DB CHECK constraints, zod schemas and the renderer. Change here, then regenerate the migration. */
import { z } from 'zod';

const enumOf = <const T extends readonly [string, ...string[]]>(values: T) => ({ values, schema: z.enum(values) });

export const AtsKind = enumOf(['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'bamboohr', 'custom']);
export type AtsKind = z.infer<typeof AtsKind.schema>;

export const QuestionType = enumOf(['text', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'file', 'date', 'number']);
export type QuestionType = z.infer<typeof QuestionType.schema>;

export const ApplicationStatus = enumOf([
  'queued',
  'running',
  'needs_answers',
  'awaiting_approval',
  'submitting',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
  'blocked',
  'failed',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus.schema>;

export const RunStatus = enumOf([
  'queued',
  'running',
  'awaiting_approval',
  'submitting',
  'needs_answers',
  'blocked',
  'submitted',
  'failed',
  'cancelled',
]);
export type RunStatus = z.infer<typeof RunStatus.schema>;
/** A run in one of these states blocks a second run for the same application (partial unique index). */
export const ACTIVE_RUN_STATUSES = ['queued', 'running', 'awaiting_approval', 'submitting'] as const satisfies readonly RunStatus[];

export const RunEventType = enumOf(['session', 'message', 'tool_call', 'tool_result', 'status', 'cost', 'error']);
export type RunEventType = z.infer<typeof RunEventType.schema>;

export const AgentId = enumOf(['claude', 'codex', 'agy']);
export type AgentId = z.infer<typeof AgentId.schema>;

export const BrowserId = enumOf(['neo', 'playwright', 'embedded']);
export type BrowserId = z.infer<typeof BrowserId.schema>;

export const Actor = enumOf(['owner', 'agent', 'system']);
export type Actor = z.infer<typeof Actor.schema>;

export const ApprovalStatus = enumOf(['pending', 'approved', 'rejected', 'expired']);
export type ApprovalStatus = z.infer<typeof ApprovalStatus.schema>;

export const AnswerSource = enumOf(['library', 'profile', 'agent', 'owner']);
export type AnswerSource = z.infer<typeof AnswerSource.schema>;

export const InboxThreadKind = enumOf(['needs_answer', 'approval', 'email', 'system']);
export type InboxThreadKind = z.infer<typeof InboxThreadKind.schema>;

export const InboxThreadStatus = enumOf(['open', 'resolved', 'snoozed']);
export type InboxThreadStatus = z.infer<typeof InboxThreadStatus.schema>;

export const MessageSender = enumOf(['owner', 'agent', 'employer', 'system']);
export type MessageSender = z.infer<typeof MessageSender.schema>;

export const EmailSignalKind = enumOf(['verification_code', 'confirmation', 'rejection', 'interview', 'reply', 'other']);
export type EmailSignalKind = z.infer<typeof EmailSignalKind.schema>;

export const DocumentKind = enumOf(['cv', 'cover_letter', 'transcript', 'other']);
export type DocumentKind = z.infer<typeof DocumentKind.schema>;

export const SiteAccountStatus = enumOf(['ok', 'needs_relogin', 'unknown']);
export type SiteAccountStatus = z.infer<typeof SiteAccountStatus.schema>;

export const CapRole = enumOf(['user', 'assistant', 'system']);
export type CapRole = z.infer<typeof CapRole.schema>;
