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
  ApplicationListItemSchema,
  IngestResultSchema,
  PostingReadStateSchema,
  ProfileDataSchema,
  ProfileSaveSchema,
  ThemeStateSchema,
  AppSettingsSchema,
  UpdateSettingsSchema,
  RemoveAllDataSchema,
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
