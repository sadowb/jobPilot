import { useMutation, useQuery } from '@tanstack/react-query';
import type { ProfileSave, ProfileData, AgentState } from '../../../shared/dto';
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

export const useAgent = () => useQuery({ queryKey: queryKeys.agent.state(), queryFn: () => bridge().agent.get() });

export const useAgentAction = () =>
  useMutation({
    mutationFn: (action: 'detect' | { save: Parameters<JobPilotBridge['agent']['save']>[0] }) =>
      action === 'detect' ? bridge().agent.detect() : bridge().agent.save(action.save),
    onSuccess: (state: AgentState) => queryClient.setQueryData(queryKeys.agent.state(), state),
  });

export const useClaudeKeyStatus = () =>
  useQuery({ queryKey: queryKeys.claudeKey.status(), queryFn: () => bridge().claudeKey.status() });

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

/** Not a hook: the profile lives in a module cache (`profileStorage`) read synchronously by the editors. */
export const saveProfile = (input: ProfileSave): Promise<ProfileData> => bridge().profile.save(input);
