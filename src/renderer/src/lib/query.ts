import { QueryClient } from '@tanstack/react-query';
import type { DataChanged } from '../../../shared/ipc';

/**
 * Data is fresh until main says it changed (`onDataChanged`), so there is no polling and no focus refetch.
 * Reads that main cannot signal (agent detection, key status) are refreshed by the mutation that changes them.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } },
});

/** One typed key factory; every `useQuery` and every invalidation takes its key from here. */
export const queryKeys = {
  applications: { all: ['applications'] as const, list: () => [...queryKeys.applications.all, 'list'] as const },
  runs: { all: ['runs'] as const },
  agent: { state: () => ['agent', 'state'] as const },
  claudeKey: { status: () => ['claude-key', 'status'] as const },
};

/** A run change also changes the application list (it embeds the latest run status). */
export function invalidateForChange(change: DataChanged, client: QueryClient = queryClient): Promise<void> {
  const keys =
    change.entity === 'run' ? [queryKeys.runs.all, queryKeys.applications.all] : [queryKeys.applications.all];
  return Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey }))).then(() => undefined);
}
