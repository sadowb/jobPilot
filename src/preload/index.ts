import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';
import {
  Channels,
  type JobPilotBridge,
  type ThemeSource,
  RendererErrorInputSchema,
  RecoveryKeySchema,
} from '../shared/ipc';
import { ThemeStateSchema } from '../shared/dto';

const bridge: JobPilotBridge = {
  platform: process.platform,
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
