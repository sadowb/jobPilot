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
export const StartRunSchema = z.object({ applicationId: z.ulid() }).strict();
export const CancelRunSchema = z.object({ runId: z.ulid() }).strict();
