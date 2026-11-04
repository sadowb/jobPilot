/** Single source of truth for IPC channel names and the renderer bridge (imported by main, preload and renderer). */
import type {
  AgentState,
  SaveAgentSchema,
  ApplicationListItem,
  IngestResult,
  PostingReadState,
  ProfileData,
  ProfileSave,
  ClaudeKeyStatus,
  ClaudeKeyTest,
  BrowserStatus,
  MemoryStatus,
  ThemeSource,
  ThemeState,
  RunSummaryDto,
  AnswerRunInput,
  ApproveResult,
  InboxEntry,
  RunsState,
  AppSettings,
  UpdateSettingsInput,
  SetApplicationStatusInput,
  RemoveAllDataInput,
  Grant,
  Preflight,
  AllowConnectionsInput,
  AllowConnectionsResult,
  CvExtraction,
  CapTurn,
  CapTurnInput,
} from './dto';
import { z } from 'zod';

export type { ThemeSource, ThemeState };

export const IpcValidationErrorSchema = z.object({
  ipcError: z.literal('INVALID_INPUT'),
  issue_codes: z.array(z.string()),
});
export type IpcValidationError = z.infer<typeof IpcValidationErrorSchema>;

export const Channels = {
  getBrowserStatus: 'browser:status',
  getAgent: 'agents:get',
  detectAgent: 'agents:detect',
  chooseAgentPath: 'agents:choosePath',
  saveAgent: 'agents:save',
  setClaudeKey: 'secrets:claude:set',
  getClaudeKeyStatus: 'secrets:claude:status',
  removeClaudeKey: 'secrets:claude:remove',
  testClaudeKey: 'secrets:claude:test',
  getMemory: 'memory:status',
  installMemory: 'memory:install',
  removeMemory: 'memory:remove',
  startRun: 'runs:start',
  cancelRun: 'runs:cancel',
  pauseRuns: 'runs:pause',
  resumeRuns: 'runs:resume',
  listRuns: 'runs:list',
  getRunsState: 'runs:state',
  listInbox: 'inbox:list',
  approveApproval: 'approvals:approve',
  rejectApproval: 'approvals:reject',
  answerRun: 'runs:answer',
  ingestPosting: 'postings:ingest',
  confirmPosting: 'postings:confirm',
  cancelIngestPosting: 'postings:cancel-ingest',
  postingReadState: 'postings:read-state',
  listApplications: 'applications:list',
  createApplication: 'applications:create',
  setApplicationStatus: 'applications:set-status',
  getProfile: 'profile:get',
  profileMigrationDone: 'profile:migration-done',
  saveProfile: 'profile:save',
  migrateProfile: 'profile:migrate',
  exportRecoveryKey: 'recovery:export',
  importRecoveryKey: 'recovery:import',
  getRecoveryState: 'recovery:state',
  restoreBackup: 'recovery:restore',
  getTheme: 'theme:get',
  saveDocument: 'documents:save',
  setTheme: 'theme:set',
  themeChanged: 'theme:changed',
  getSettings: 'settings:get',
  updateSettings: 'settings:update',
  removeAllData: 'settings:removeAllData',
  listGrants: 'grants:list',
  revokeGrant: 'grants:revoke',
  preflight: 'onboarding:preflight',
  chooseCustomAgent: 'onboarding:choose-custom-agent',
  allowConnections: 'onboarding:allow',
  extractCv: 'onboarding:extract-cv',
  capTurn: 'onboarding:cap-turn',
  dataChanged: 'data:changed',
  rendererError: 'observability:renderer-error',
} as const;

/** Main -> renderer: something the renderer may have cached changed. Carries no data, only what to refetch. */
export const DataChangedSchema = z.object({ entity: z.enum(['application', 'run']), id: z.string().min(1).max(64) });
export type DataChanged = z.infer<typeof DataChangedSchema>;

export const RendererErrorInputSchema = z.object({
  kind: z.enum(['error', 'unhandledrejection']),
  message: z.string().min(1).max(4000),
  stack: z.string().max(12000).optional(),
});

export const RecoveryKeySchema = z.string().regex(/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/);

export const RecoveryReasonSchema = z.enum(['unlock', 'empty', 'corrupt', 'missing']);
export const BackupInfoSchema = z.object({
  name: z.string().regex(/^jobpilot-\d{4}-\d{2}-\d{2}(-migration-\d+)?\.db$/),
  modifiedAt: z.string(),
  size: z.number().int().nonnegative(),
});
export const RecoveryStateSchema = z.object({ reason: RecoveryReasonSchema, backups: z.array(BackupInfoSchema) });
export type RecoveryState = z.infer<typeof RecoveryStateSchema>;
export const RestoreBackupSchema = z.object({
  name: BackupInfoSchema.shape.name,
  recoveryKey: RecoveryKeySchema.optional(),
});

export interface JobPilotBridge {
  browser: {
    status(): Promise<BrowserStatus>;
  };
  agent: {
    get(): Promise<AgentState>;
    detect(): Promise<AgentState>;
    /** Main opens the native file picker; the renderer never supplies a path. */
    choosePath(): Promise<AgentState>;
    save(input: z.infer<typeof SaveAgentSchema>): Promise<AgentState>;
  };
  claudeKey: {
    set(key: string): Promise<void>;
    status(): Promise<ClaudeKeyStatus>;
    remove(): Promise<void>;
    test(): Promise<ClaudeKeyTest>;
  };
  memory: {
    status(): Promise<MemoryStatus>;
    install(): Promise<MemoryStatus>;
    remove(): Promise<MemoryStatus>;
  };
  runs: {
    start(applicationId: string): Promise<RunSummaryDto>;
    cancel(runId: string): Promise<RunSummaryDto>;
    pause(): Promise<boolean>;
    resume(): Promise<boolean>;
    list(): Promise<RunSummaryDto[]>;
    state(): Promise<RunsState>;
    /** The owner's answers to a run's questions; the run is filled again with them. */
    answer(input: AnswerRunInput): Promise<RunSummaryDto>;
  };
  inbox: {
    list(): Promise<InboxEntry[]>;
    /** Binds to the form hash stored with the approval; main re-checks the live form before anything is sent. */
    approve(approvalId: string): Promise<ApproveResult>;
    reject(approvalId: string): Promise<RunSummaryDto>;
  };
  postings: {
    ingest(url: string): Promise<IngestResult>;
    confirm(postingId: string): Promise<boolean>;
    /** Aborts an in-flight ingest of this pasted URL (closing the dialog or removing the row). */
    cancelIngest(url: string): Promise<boolean>;
    /** Main -> renderer: the agent started reading a pasted URL, which can take a minute. */
    onReadState(listener: (state: PostingReadState) => void): () => void;
  };
  applications: {
    list(): Promise<ApplicationListItem[]>;
    create(postingId: string): Promise<ApplicationListItem>;
    setStatus(input: SetApplicationStatusInput): Promise<ApplicationListItem>;
  };
  profile: {
    get(): Promise<ProfileData>;
    migrationDone(): Promise<boolean>;
    save(input: ProfileSave): Promise<ProfileData>;
    migrate(input: ProfileData): Promise<ProfileData>;
  };
  recovery: {
    export(): Promise<void>;
    import(key: string): Promise<boolean>;
    state(): Promise<RecoveryState>;
    restore(input: z.input<typeof RestoreBackupSchema>): Promise<boolean>;
  };
  platform: string;
  reportRendererError(error: z.input<typeof RendererErrorInputSchema>): Promise<void>;
  documents: { save(name: string, bytes: Uint8Array): Promise<boolean> };
  theme: {
    get(): Promise<ThemeState>;
    set(source: ThemeSource): Promise<ThemeState>;
    onChange(listener: (state: ThemeState) => void): () => void;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(input: UpdateSettingsInput): Promise<AppSettings>;
    /** Deletes all JobPilot data and quits; normally the app exits before this resolves. */
    removeAllData(input: RemoveAllDataInput): Promise<void>;
  };
  grants: {
    list(): Promise<Grant[]>;
    revoke(id: string): Promise<Grant>;
  };
  onboarding: {
    /** Local, read-only detection of agents and browser tools. No ports or paths other than the resolved agent binary. */
    preflight(): Promise<Preflight>;
    /** Main opens the native file picker for "another agent"; the renderer never supplies a path. */
    chooseCustomAgent(): Promise<Preflight>;
    allow(input: AllowConnectionsInput): Promise<AllowConnectionsResult>;
    /** The CV bytes are read in main; nothing is stored. */
    extractCv(name: string, bytes: Uint8Array): Promise<CvExtraction>;
    capTurn(input: CapTurnInput): Promise<CapTurn>;
  };
  onDataChanged(listener: (change: DataChanged) => void): () => void;
}
