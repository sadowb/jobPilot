import { z } from 'zod';
import type { RunResult } from '../../platform/agents/types';
import { UserFacingError } from '../../platform/ipc/user-facing-error';

const MAX_REASON = 200;
export const GENERIC_FAILURE = 'Provider failed or returned an invalid result';

/** zod messages can quote the offending value, so only paths and issue codes are ever kept. */
export function zodIssues(error: z.ZodError): string[] {
  return error.issues.slice(0, 8).map((issue) => `${issue.path.join('.') || '(root)'}:${issue.code}`);
}

/**
 * The reason stored on a failed run and shown to the owner. Provider and browser errors carry short curated messages
 * ("Claude run timed out."); anything that could quote a file path or page text falls back to the generic line.
 */
export function failureReason(error: unknown): string {
  if (error instanceof UserFacingError) return error.message.slice(0, MAX_REASON);
  if (error instanceof z.ZodError) return `Unexpected data from the agent or browser (${zodIssues(error).join(', ')})`;
  if (error instanceof Error && /^[\w .,:'()-]{1,160}$/.test(error.message)) return error.message;
  return GENERIC_FAILURE;
}

/** Why an agent that finished by itself still reported `failed`: its first blocker, else a fixed sentence. */
export function agentFailureReason(result: RunResult): string {
  const blocker = result.blockers[0]?.message.replace(/\s+/g, ' ').trim();
  return blocker
    ? `The agent could not complete the form: ${blocker}`.slice(0, MAX_REASON)
    : 'The agent reported that it could not complete the form.';
}
