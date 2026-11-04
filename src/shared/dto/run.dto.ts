import { z } from 'zod';
import { RunStatus, type RunEventType } from './enums';

/** One row of the live run log (`run_event`), as the renderer sees it. */
export interface RunEventDto {
  id: string;
  runId: string;
  seq: number;
  type: RunEventType;
  payload: unknown;
  createdAt: number;
}

export const RunSummarySchema = z.object({
  id: z.ulid(),
  applicationId: z.ulid(),
  status: RunStatus.schema,
  startedAt: z.number().int().nullable(),
  finishedAt: z.number().int().nullable(),
  error: z.string().nullable().optional(),
});
export type RunSummaryDto = z.infer<typeof RunSummarySchema>;
/** Why the queue is paused: the owner did it, or JobPilot closed/crashed with jobs in progress. */
export const RunsPauseReasonSchema = z.enum(['owner', 'interrupted', 'quit']);
export type RunsPauseReason = z.infer<typeof RunsPauseReasonSchema>;
export const RunsStateSchema = z.object({ paused: z.boolean(), reason: RunsPauseReasonSchema.nullable() });
export type RunsState = z.infer<typeof RunsStateSchema>;
export const StartRunSchema = z.object({ applicationId: z.ulid() }).strict();
export const CancelRunSchema = z.object({ runId: z.ulid() }).strict();
/** Input of the tab-control actions (go to tab, take over, hand back): the run only; main finds its tab. */
export const RunTabSchema = CancelRunSchema;
/** Where a run's tab is. Host only: the full address can carry tokens and the owner already sees it in the browser. */
export const RunTabLocationSchema = z.object({ tabId: z.string(), host: z.string().nullable() });
export type RunTabLocation = z.infer<typeof RunTabLocationSchema>;
