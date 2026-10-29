import { QueryClient } from '@tanstack/react-query';
import type { DataChanged } from '../../../shared/ipc';

/**
 * Data is fresh until main says it changed (`onDataChanged`), so there is no polling and no focus refetch.
 * Reads that change outside the app (agent sign-in, key status) opt out with `staleTime: 0` and re-read on mount.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } },
});

/** One typed key factory; every `useQuery` and every invalidation takes its key from here. */
export const queryKeys = {
  applications: { all: ['applications'] as const, list: () => [...queryKeys.applications.all, 'list'] as const },
  runs: { all: ['runs'] as const, state: () => ['runs', 'state'] as const },
  recovery: { state: () => ['recovery', 'state'] as const },
  agent: { state: () => ['agent', 'state'] as const },
  claudeKey: { status: () => ['claude-key', 'status'] as const },
  settings: { all: ['settings'] as const, current: () => [...queryKeys.settings.all, 'current'] as const },
};

/** A run change also changes the application list (it embeds the latest run status). */
export function invalidateForChange(change: DataChanged, client: QueryClient = queryClient): Promise<void> {
  const keys =
    change.entity === 'run' ? [queryKeys.runs.all, queryKeys.applications.all] : [queryKeys.applications.all];
  return Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey }))).then(() => undefined);
}
