import type { RunSummaryDto } from '../../../../../shared/dto';
import type { QueueItem } from './queue';

export type RowRunAction = 'start' | 'cancel';

/** Run controls a row offers: queued jobs start; running or stopped-for-you jobs cancel; held jobs offer neither. */
export const rowRunActions = (item: Pick<QueueItem, 'stage'>): RowRunAction[] =>
  item.stage === 'queued' ? ['start'] : item.stage === 'running' || item.stage === 'waiting' ? ['cancel'] : [];

const CANCELLABLE: RunSummaryDto['status'][] = ['running', 'awaiting_approval', 'needs_you'];

/** The run Cancel acts on for each application: its latest cancellable run. */
export function cancellableRuns(runs: readonly RunSummaryDto[] | undefined): Map<string, string> {
  const byApp = new Map<string, string>();
  // runs.list is newest first, so the first hit per application is its latest run.
  for (const run of runs ?? [])
    if (CANCELLABLE.includes(run.status) && !byApp.has(run.applicationId)) byApp.set(run.applicationId, run.id);
  return byApp;
}

/** Electron wraps main's thrown message as "Error invoking remote method 'x': Error: msg"; show only msg. */
export const runErrorMessage = (err: unknown, fallback: string): string => {
  const raw = err instanceof Error ? err.message : '';
  return raw.replace(/^Error invoking remote method '[^']*': (?:(?:User[A-Za-z]*)?Error: )?/, '').trim() || fallback;
};
