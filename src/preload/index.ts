import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';
import {
  Channels,
  type JobPilotBridge,
  type ThemeSource,
  RendererErrorInputSchema,
  RecoveryKeySchema,
  RecoveryStateSchema,
  RestoreBackupSchema,
  IpcValidationErrorSchema,
  DataChangedSchema,
} from '../shared/ipc';
import {
  AgentStateSchema,
  SaveAgentSchema,
  ClaudeKeyStatusSchema,
  ClaudeKeyTestSchema,
  MemoryStatusSchema,
  RunSummarySchema,
  RunsStateSchema,
  StartRunSchema,
  CancelRunSchema,
  AnswerRunSchema,
  ChatMessageSchema,
  JobChatSchema,
  SendCapChatSchema,
  SendJobChatSchema,
  RunTabLocationSchema,
  RunTabSchema,
  ApproveResultSchema,
  DecideApprovalSchema,
  InboxEntrySchema,
  ApplicationListItemSchema,
  IngestResultSchema,
  PostingReadStateSchema,
  ProfileDataSchema,
  ProfileSaveSchema,
  ThemeStateSchema,
  AppSettingsSchema,
  UpdateSettingsSchema,
  RemoveAllDataSchema,
  GrantSchema,
  GrantListSchema,
  RevokeGrantSchema,
  PreflightSchema,
  AllowConnectionsSchema,
  AllowConnectionsResultSchema,
  ExtractCvSchema,
  CvExtractionSchema,
  CapTurnInputSchema,
  CapTurnSchema,
  BrowserStatusSchema,
} from '../shared/dto';
import { parseInput } from '../shared/invalid-request';

async function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const result: unknown = await ipcRenderer.invoke(channel, ...args);
  if (IpcValidationErrorSchema.safeParse(result).success) {
    throw new TypeError('Invalid input. Check your input and try again.');
  }
  return result;
}

const bridge: JobPilotBridge = {
  browser: {
    async status() {
      return BrowserStatusSchema.parse(await invoke(Channels.getBrowserStatus));
    },
  },
  agent: {
    async get() {
      return AgentStateSchema.parse(await invoke(Channels.getAgent));
    },
    async detect() {
      return AgentStateSchema.parse(await invoke(Channels.detectAgent));
    },
    async choosePath() {
      return AgentStateSchema.parse(await invoke(Channels.chooseAgentPath));
    },
    async save(input) {
      return AgentStateSchema.parse(await invoke(Channels.saveAgent, parseInput(SaveAgentSchema, input)));
    },
  },
  grants: {
    async list() {
      return GrantListSchema.parse(await invoke(Channels.listGrants));
    },
    async revoke(id) {
      return GrantSchema.parse(await invoke(Channels.revokeGrant, parseInput(RevokeGrantSchema, { id })));
    },
  },
  onboarding: {
    async preflight() {
      return PreflightSchema.parse(await invoke(Channels.preflight));
    },
    async chooseCustomAgent() {
      return PreflightSchema.parse(await invoke(Channels.chooseCustomAgent));
    },
    async allow(input) {
      return AllowConnectionsResultSchema.parse(
        await invoke(Channels.allowConnections, parseInput(AllowConnectionsSchema, input)),
      );
    },
    async extractCv(name, bytes) {
      return CvExtractionSchema.parse(await invoke(Channels.extractCv, parseInput(ExtractCvSchema, { name, bytes })));
    },
    async capTurn(input) {
      return CapTurnSchema.parse(await invoke(Channels.capTurn, parseInput(CapTurnInputSchema, input)));
    },
  },
  claudeKey: {
    async set(key) {
      await invoke(Channels.setClaudeKey, key);
    },
    async status() {
      return ClaudeKeyStatusSchema.parse(await invoke(Channels.getClaudeKeyStatus));
    },
    async remove() {
      await invoke(Channels.removeClaudeKey);
    },
    async test() {
      return ClaudeKeyTestSchema.parse(await invoke(Channels.testClaudeKey));
    },
  },
  memory: {
    async status() {
      return MemoryStatusSchema.parse(await invoke(Channels.getMemory));
    },
    async install() {
      return MemoryStatusSchema.parse(await invoke(Channels.installMemory));
    },
    async remove() {
      return MemoryStatusSchema.parse(await invoke(Channels.removeMemory));
    },
  },
  runs: {
    async start(applicationId) {
      // Short message only: a zod issue would leak the id regex to the renderer.
      const parsed = StartRunSchema.safeParse({ applicationId });
      if (!parsed.success) throw new TypeError('That application id is not valid.');
      return RunSummarySchema.parse(await invoke(Channels.startRun, parsed.data));
    },
    async cancel(runId) {
      const parsed = CancelRunSchema.safeParse({ runId });
      if (!parsed.success) throw new TypeError('That run id is not valid.');
      return RunSummarySchema.parse(await invoke(Channels.cancelRun, parsed.data));
    },
    async list() {
      return z.array(RunSummarySchema).parse(await invoke(Channels.listRuns));
    },
    async state() {
      return RunsStateSchema.parse(await invoke(Channels.getRunsState));
    },
    async pause() {
      return z.boolean().parse(await invoke(Channels.pauseRuns));
    },
    async resume() {
      return z.boolean().parse(await invoke(Channels.resumeRuns));
    },
    async answer(input) {
      return RunSummarySchema.parse(await invoke(Channels.answerRun, parseInput(AnswerRunSchema, input)));
    },
    async goToTab(runId) {
      return RunTabLocationSchema.parse(await invoke(Channels.goToRunTab, parseInput(RunTabSchema, { runId })));
    },
    async takeOver(runId) {
      return RunSummarySchema.parse(await invoke(Channels.takeOverRun, parseInput(RunTabSchema, { runId })));
    },
    async handBack(runId) {
      return RunSummarySchema.parse(await invoke(Channels.handBackRun, parseInput(RunTabSchema, { runId })));
    },
  },
  chat: {
    async jobMessages(applicationId) {
      return z
        .array(ChatMessageSchema)
        .parse(await invoke(Channels.listJobChat, parseInput(JobChatSchema, { applicationId })));
    },
    async sendToJob(input) {
      return z.array(ChatMessageSchema).parse(await invoke(Channels.sendJobChat, parseInput(SendJobChatSchema, input)));
    },
    async capMessages() {
      return z.array(ChatMessageSchema).parse(await invoke(Channels.listCapChat));
    },
    async sendToCap(input) {
      return z.array(ChatMessageSchema).parse(await invoke(Channels.sendCapChat, parseInput(SendCapChatSchema, input)));
    },
  },
  inbox: {
    async list() {
      return z.array(InboxEntrySchema).parse(await invoke(Channels.listInbox));
    },
    async approve(approvalId) {
      return ApproveResultSchema.parse(
        await invoke(Channels.approveApproval, parseInput(DecideApprovalSchema, { approvalId })),
      );
    },
    async reject(approvalId) {
      return RunSummarySchema.parse(
        await invoke(Channels.rejectApproval, parseInput(DecideApprovalSchema, { approvalId })),
      );
    },
  },
  postings: {
    async ingest(url) {
      return IngestResultSchema.parse(await invoke(Channels.ingestPosting, url));
    },
    async confirm(postingId) {
      return z.boolean().parse(await invoke(Channels.confirmPosting, { postingId }));
    },
    async cancelIngest(url) {
      return z.boolean().parse(await invoke(Channels.cancelIngestPosting, url));
    },
    onReadState(listener) {
      const handler = (_event: Electron.IpcRendererEvent, state: unknown) => {
        const parsed = PostingReadStateSchema.safeParse(state);
        if (parsed.success) listener(parsed.data);
      };
      ipcRenderer.on(Channels.postingReadState, handler);
      return () => ipcRenderer.removeListener(Channels.postingReadState, handler);
    },
  },
  applications: {
    async list() {
      return z.array(ApplicationListItemSchema).parse(await invoke(Channels.listApplications));
    },
    async create(postingId) {
      return ApplicationListItemSchema.parse(await invoke(Channels.createApplication, { postingId }));
    },
    async setStatus(input) {
      return ApplicationListItemSchema.parse(await invoke(Channels.setApplicationStatus, input));
    },
    async remove(id) {
      await invoke(Channels.removeApplication, { id });
    },
    async restore(id) {
      return ApplicationListItemSchema.parse(await invoke(Channels.restoreApplication, { id }));
    },
  },
  platform: process.platform,
  profile: {
    async migrationDone() {
      return z.boolean().parse(await invoke(Channels.profileMigrationDone));
    },
    async get() {
      return ProfileDataSchema.parse(await invoke(Channels.getProfile));
    },
    async save(input) {
      return ProfileDataSchema.parse(await invoke(Channels.saveProfile, parseInput(ProfileSaveSchema, input)));
    },
    async migrate(input) {
      return ProfileDataSchema.parse(await invoke(Channels.migrateProfile, parseInput(ProfileDataSchema, input)));
    },
  },
  recovery: {
    async export() {
      await invoke(Channels.exportRecoveryKey);
    },
    async import(key) {
      // Short message only: a zod issue would leak the key regex and echo the (possibly huge) input.
      const parsed = RecoveryKeySchema.safeParse(key);
      if (!parsed.success) throw new TypeError('That is not a valid recovery key.');
      return z.boolean().parse(await invoke(Channels.importRecoveryKey, parsed.data));
    },
    async state() {
      return RecoveryStateSchema.parse(await invoke(Channels.getRecoveryState));
    },
    async restore(input) {
      const parsed = RestoreBackupSchema.safeParse(input);
      if (!parsed.success) throw new TypeError('Choose a backup and, if given, a valid recovery key.');
      return z.boolean().parse(await invoke(Channels.restoreBackup, parsed.data));
    },
  },
  async reportRendererError(error) {
    await invoke(Channels.rendererError, parseInput(RendererErrorInputSchema, error));
  },
  documents: {
    async save(name, bytes) {
      return z.boolean().parse(await invoke(Channels.saveDocument, { name, bytes }));
    },
  },
  theme: {
    async get() {
      return ThemeStateSchema.parse(await invoke(Channels.getTheme));
    },
    async set(source: ThemeSource) {
      return ThemeStateSchema.parse(await invoke(Channels.setTheme, source));
    },
    onChange(listener) {
      const handler = (_event: Electron.IpcRendererEvent, state: unknown) => listener(ThemeStateSchema.parse(state));
      ipcRenderer.on(Channels.themeChanged, handler);
      return () => ipcRenderer.removeListener(Channels.themeChanged, handler);
    },
  },
  settings: {
    async get() {
      return AppSettingsSchema.parse(await invoke(Channels.getSettings));
    },
    async update(input) {
      return AppSettingsSchema.parse(await invoke(Channels.updateSettings, parseInput(UpdateSettingsSchema, input)));
    },
    async removeAllData(input) {
      await invoke(Channels.removeAllData, parseInput(RemoveAllDataSchema, input));
    },
  },
  onDataChanged(listener) {
    const handler = (_event: Electron.IpcRendererEvent, change: unknown) => {
      const parsed = DataChangedSchema.safeParse(change);
      if (parsed.success) listener(parsed.data);
    };
    ipcRenderer.on(Channels.dataChanged, handler);
    return () => ipcRenderer.removeListener(Channels.dataChanged, handler);
  },
};

contextBridge.exposeInMainWorld('jobpilot', bridge);
