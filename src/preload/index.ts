import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';
import {
  Channels,
  type JobPilotBridge,
  type ThemeSource,
  RendererErrorInputSchema,
  RecoveryKeySchema,
} from '../shared/ipc';
import { ApplicationListItemSchema, IngestResultSchema, ProfileDataSchema, ProfileSaveSchema, ThemeStateSchema } from '../shared/dto';

const bridge: JobPilotBridge = {
  postings: {
    async ingest(url) {
      return IngestResultSchema.parse(await ipcRenderer.invoke(Channels.ingestPosting, url));
    },
  },
  applications: {
    async list() {
      return z.array(ApplicationListItemSchema).parse(await ipcRenderer.invoke(Channels.listApplications));
    },
    async create(postingId) {
      return ApplicationListItemSchema.parse(await ipcRenderer.invoke(Channels.createApplication, { postingId }));
    },
  },
  platform: process.platform,
  profile: {
    async migrationDone() {
      return z.boolean().parse(await ipcRenderer.invoke(Channels.profileMigrationDone));
    },
    async get() {
      return ProfileDataSchema.parse(await ipcRenderer.invoke(Channels.getProfile));
    },
    async save(input) {
      return ProfileDataSchema.parse(await ipcRenderer.invoke(Channels.saveProfile, ProfileSaveSchema.parse(input)));
    },
    async migrate(input) {
      return ProfileDataSchema.parse(await ipcRenderer.invoke(Channels.migrateProfile, ProfileDataSchema.parse(input)));
    },
  },
  recovery: {
    async export() {
      await ipcRenderer.invoke(Channels.exportRecoveryKey);
    },
    async import(key) {
      return z.boolean().parse(await ipcRenderer.invoke(Channels.importRecoveryKey, RecoveryKeySchema.parse(key)));
    },
  },
  async reportRendererError(error) {
    await ipcRenderer.invoke(Channels.rendererError, RendererErrorInputSchema.parse(error));
  },
  documents: {
    async save(name, bytes) {
      return z.boolean().parse(await ipcRenderer.invoke(Channels.saveDocument, { name, bytes }));
    },
  },
  theme: {
    async get() {
      return ThemeStateSchema.parse(await ipcRenderer.invoke(Channels.getTheme));
    },
    async set(source: ThemeSource) {
      return ThemeStateSchema.parse(await ipcRenderer.invoke(Channels.setTheme, source));
    },
    onChange(listener) {
      const handler = (_event: Electron.IpcRendererEvent, state: unknown) => listener(ThemeStateSchema.parse(state));
      ipcRenderer.on(Channels.themeChanged, handler);
      return () => ipcRenderer.removeListener(Channels.themeChanged, handler);
    },
  },
};

contextBridge.exposeInMainWorld('jobpilot', bridge);
