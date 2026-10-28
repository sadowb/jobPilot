import { useMutation, useQuery } from '@tanstack/react-query';
import type { ProfileSave, ProfileData, AgentState, AppSettings, UpdateSettingsInput } from '../../../shared/dto';
import type { JobPilotBridge } from '../../../shared/ipc';
import { invalidateForChange, queryClient, queryKeys } from './query';

/**
 * The only place the renderer touches `window.jobpilot` (besides bootstrap and theme). Components use these
 * hooks; reads are `useQuery`, writes are `useMutation` that invalidate the keys they affect.
 */
function bridge(): JobPilotBridge {
  if (!window.jobpilot) throw new Error('The JobPilot bridge is unavailable.');
  return window.jobpilot;
}

export const hasBridge = (): boolean => !!window.jobpilot;
export const hostPlatform = (): string | undefined => window.jobpilot?.platform;

/** Starts forwarding main's data-changed events to query invalidation. Returns the unsubscribe. */
export function connectDataEvents(): () => void {
  return window.jobpilot?.onDataChanged((change) => void invalidateForChange(change)) ?? (() => undefined);
}

export const useApplications = () =>
  useQuery({ queryKey: queryKeys.applications.list(), queryFn: () => bridge().applications.list() });

export const useCreateApplication = () =>
  useMutation({
    mutationFn: (postingId: string) => bridge().applications.create(postingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications.all }),
  });

export const useIngestPosting = () => useMutation({ mutationFn: (url: string) => bridge().postings.ingest(url) });

export const useAgent = () =>
  useQuery({
    queryKey: queryKeys.agent.state(),
    queryFn: () => bridge().agent.get(),
    // Claude's install and sign-in change outside the app, so re-read whenever the card mounts.
    staleTime: 0,
  });

export const useAgentAction = () =>
  useMutation({
    mutationFn: (action: 'detect' | 'choose' | { save: Parameters<JobPilotBridge['agent']['save']>[0] }) =>
      action === 'detect'
        ? bridge().agent.detect()
        : action === 'choose'
          ? bridge().agent.choosePath()
          : bridge().agent.save(action.save),
    onSuccess: (state: AgentState) => queryClient.setQueryData(queryKeys.agent.state(), state),
  });

export const useClaudeKeyStatus = () =>
  useQuery({
    queryKey: queryKeys.claudeKey.status(),
    queryFn: () => bridge().claudeKey.status(),
    staleTime: 0,
  });

const refreshKeyStatus = () => queryClient.invalidateQueries({ queryKey: queryKeys.claudeKey.status() });

export const useSetClaudeKey = () =>
  useMutation({ mutationFn: (key: string) => bridge().claudeKey.set(key), onSettled: refreshKeyStatus });
export const useRemoveClaudeKey = () =>
  useMutation({ mutationFn: () => bridge().claudeKey.remove(), onSettled: refreshKeyStatus });
export const useTestClaudeKey = () => useMutation({ mutationFn: () => bridge().claudeKey.test() });

export const useSaveDocument = () =>
  useMutation({
    mutationFn: (doc: { name: string; bytes: Uint8Array }) => bridge().documents.save(doc.name, doc.bytes),
  });

export const useExportRecoveryKey = () => useMutation({ mutationFn: () => bridge().recovery.export() });

export const useRecoveryState = () =>
  useQuery({ queryKey: queryKeys.recovery.state(), queryFn: () => bridge().recovery.state() });
export const useImportRecoveryKey = () => useMutation({ mutationFn: (key: string) => bridge().recovery.import(key) });
export const useRestoreBackup = () =>
  useMutation({
    mutationFn: (input: Parameters<JobPilotBridge['recovery']['restore']>[0]) => bridge().recovery.restore(input),
  });

export const useSettings = () =>
  useQuery({
    queryKey: queryKeys.settings.current(),
    queryFn: () => bridge().settings.get(),
  });

export const useUpdateSettings = () =>
  useMutation({
    mutationFn: (input: UpdateSettingsInput) => bridge().settings.update(input),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.current() });
      const previous = queryClient.getQueryData<AppSettings>(queryKeys.settings.current());
      if (previous) {
        queryClient.setQueryData<AppSettings>(queryKeys.settings.current(), {
          ...previous,
          ...patch,
          limits: patch.limits ? { ...previous.limits, ...patch.limits } : previous.limits,
          sites: patch.sites ? { ...previous.sites, ...patch.sites } : previous.sites,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.settings.current(), context.previous);
      }
    },
    onSuccess: (saved: AppSettings) => {
      queryClient.setQueryData(queryKeys.settings.current(), saved);
    },
  });

/** Not a hook: the profile lives in a module cache (`profileStorage`) read synchronously by the editors. */
export const saveProfile = (input: ProfileSave): Promise<ProfileData> => bridge().profile.save(input);
