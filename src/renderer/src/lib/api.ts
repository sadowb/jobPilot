import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  AnswerRunInput,
  CapTurnInput,
  ProfileSave,
  ProfileData,
  AgentState,
  AppSettings,
  SetApplicationStatusInput,
  UpdateSettingsInput,
} from '../../../shared/dto';
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

/** Main owns the queue pause flag; this reads it and refetches when main emits a run change. */
export const useRunsState = () => useQuery({ queryKey: queryKeys.runs.state(), queryFn: () => bridge().runs.state() });

export const useSetRunsPaused = () =>
  useMutation({
    mutationFn: (paused: boolean) => (paused ? bridge().runs.pause() : bridge().runs.resume()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.runs.state() }),
  });

export const useRuns = () => useQuery({ queryKey: queryKeys.runs.list(), queryFn: () => bridge().runs.list() });

/** Main enforces the trust gate and idempotency; both mutations just refetch what a run change touches. */
const invalidateRuns = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.runs.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.applications.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all }),
  ]);

export const useStartRun = () =>
  useMutation({ mutationFn: (applicationId: string) => bridge().runs.start(applicationId), onSettled: invalidateRuns });

export const useCancelRun = () =>
  useMutation({ mutationFn: (runId: string) => bridge().runs.cancel(runId), onSettled: invalidateRuns });

export const useInbox = () => useQuery({ queryKey: queryKeys.inbox.list(), queryFn: () => bridge().inbox.list() });

/** Main decides what an approval means (hash re-check, idempotency); these only refetch what a decision touches. */
export const useApprove = () =>
  useMutation({ mutationFn: (approvalId: string) => bridge().inbox.approve(approvalId), onSettled: invalidateRuns });

export const useReject = () =>
  useMutation({ mutationFn: (approvalId: string) => bridge().inbox.reject(approvalId), onSettled: invalidateRuns });

export const useAnswerRun = () =>
  useMutation({ mutationFn: (input: AnswerRunInput) => bridge().runs.answer(input), onSettled: invalidateRuns });

export const useApplications = () =>
  useQuery({ queryKey: queryKeys.applications.list(), queryFn: () => bridge().applications.list() });

export const useCreateApplication = () =>
  useMutation({
    mutationFn: (postingId: string) => bridge().applications.create(postingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications.all }),
  });

export const useSetApplicationStatus = () =>
  useMutation({
    mutationFn: (input: SetApplicationStatusInput) => bridge().applications.setStatus(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications.all }),
  });
export const useConfirmPosting = () => {
  const { mutate } = useMutation({
    mutationFn: (postingId: string) => bridge().postings.confirm(postingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications.all }),
  });
  return mutate;
};

export const useIngestPosting = () => useMutation({ mutationFn: (url: string) => bridge().postings.ingest(url) });

/** Aborts an in-flight ingest (and any agent read behind it); best effort, the dialog does not wait for it. */
export const cancelIngest = (url: string): void =>
  void window.jobpilot?.postings.cancelIngest(url).catch(() => undefined);

/** Fires when main starts reading a pasted URL with the agent. Returns the unsubscribe. */
export const onPostingReadState: JobPilotBridge['postings']['onReadState'] = (listener) =>
  window.jobpilot?.postings.onReadState(listener) ?? (() => undefined);

export const useAgent = () =>
  useQuery({
    queryKey: queryKeys.agent.state(),
    queryFn: () => bridge().agent.get(),
    // Claude's install and sign-in change outside the app, so re-read whenever the card mounts.
    staleTime: 0,
  });

export const useBrowserStatus = () =>
  useQuery({
    queryKey: queryKeys.browser.status(),
    queryFn: () => bridge().browser.status(),
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

export const useRemoveAllData = () =>
  useMutation({ mutationFn: () => bridge().settings.removeAllData({ confirm: 'DELETE' }) });
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

/**
 * Setup's local detection (agents, browser tools). It reads the machine, so it re-reads on mount.
 * `useBrowserTools` is the one place the browser status enters the UI: when the MCP discovery (#196) lists more
 * tools, the list just grows; the UI never sees a port or URL.
 */
export const usePreflight = () =>
  useQuery({ queryKey: queryKeys.preflight.all, queryFn: () => bridge().onboarding.preflight(), staleTime: 0 });
export const useBrowserTools = () =>
  useQuery({
    queryKey: queryKeys.preflight.all,
    queryFn: () => bridge().onboarding.preflight(),
    staleTime: 0,
    select: (preflight) => preflight.browsers,
  });

export const useChooseCustomAgent = () =>
  useMutation({
    mutationFn: () => bridge().onboarding.chooseCustomAgent(),
    onSuccess: (preflight) => queryClient.setQueryData(queryKeys.preflight.all, preflight),
  });

const refreshGrants = () => queryClient.invalidateQueries({ queryKey: queryKeys.grants.all });

export const useGrants = () => useQuery({ queryKey: queryKeys.grants.all, queryFn: () => bridge().grants.list() });
export const useAllowConnections = () =>
  useMutation({
    mutationFn: (input: Parameters<JobPilotBridge['onboarding']['allow']>[0]) => bridge().onboarding.allow(input),
    onSettled: () =>
      Promise.all([refreshGrants(), queryClient.invalidateQueries({ queryKey: queryKeys.agent.state() })]),
  });
export const useRevokeGrant = () =>
  useMutation({ mutationFn: (id: string) => bridge().grants.revoke(id), onSettled: refreshGrants });

export const useExtractCv = () =>
  useMutation({
    mutationFn: (cv: { name: string; bytes: Uint8Array }) => bridge().onboarding.extractCv(cv.name, cv.bytes),
  });
export const useCapTurn = () =>
  useMutation({ mutationFn: (input: CapTurnInput) => bridge().onboarding.capTurn(input) });
