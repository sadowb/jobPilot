import { contextBridge, ipcRenderer } from 'electron';
import { Channels, type JobPilotBridge, type ThemeSource, type ThemeState } from '../shared/ipc';

const bridge: JobPilotBridge = {
  platform: process.platform,
  documents: { save: (name, bytes) => ipcRenderer.invoke(Channels.saveDocument, name, bytes) as Promise<boolean> },
  theme: {
    get: () => ipcRenderer.invoke(Channels.getTheme) as Promise<ThemeState>,
    set: (source: ThemeSource) => ipcRenderer.invoke(Channels.setTheme, source) as Promise<ThemeState>,
    onChange(listener) {
      const handler = (_event: Electron.IpcRendererEvent, state: ThemeState) => listener(state);
      ipcRenderer.on(Channels.themeChanged, handler);
      return () => ipcRenderer.removeListener(Channels.themeChanged, handler);
    },
  },
};

contextBridge.exposeInMainWorld('jobpilot', bridge);
