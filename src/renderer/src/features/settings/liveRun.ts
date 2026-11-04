import type { RunStatus } from '../../../../shared/dto';

/** Runs that have not reached a final state: turning a connection off under them stops their agent or browser. */
const SETTLED = new Set<RunStatus>(['submitted', 'failed', 'cancelled']);
export const hasLiveRun = (runs: readonly { status: RunStatus }[] | undefined) =>
  (runs ?? []).some((run) => !SETTLED.has(run.status));
