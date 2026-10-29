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
});
export type RunSummaryDto = z.infer<typeof RunSummarySchema>;
/** Why the queue is paused: the owner did it, or JobPilot closed/crashed with jobs in progress. */
export const RunsPauseReasonSchema = z.enum(['owner', 'interrupted', 'quit']);
export type RunsPauseReason = z.infer<typeof RunsPauseReasonSchema>;
export const RunsStateSchema = z.object({ paused: z.boolean(), reason: RunsPauseReasonSchema.nullable() });
export type RunsState = z.infer<typeof RunsStateSchema>;
export const StartRunSchema = z.object({ applicationId: z.ulid() }).strict();
export const CancelRunSchema = z.object({ runId: z.ulid() }).strict();
