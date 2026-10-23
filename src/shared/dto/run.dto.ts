import type { RunEventType, RunStatus } from './enums';

/** One row of the live run log (`run_event`), as the renderer sees it. */
export interface RunEventDto {
  id: string;
  runId: string;
  seq: number;
  type: RunEventType;
  payload: unknown;
  createdAt: number;
}

export interface RunSummaryDto {
  id: string;
  applicationId: string;
  status: RunStatus;
  startedAt: number | null;
  finishedAt: number | null;
}
