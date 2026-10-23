/** Single source of truth for IPC channel names and the renderer bridge (imported by main, preload and renderer). */
import type { ThemeSource, ThemeState } from './dto';

export type { ThemeSource, ThemeState };

export const Channels = {
  getTheme: 'theme:get',
  saveDocument: 'documents:save',
  setTheme: 'theme:set',
  themeChanged: 'theme:changed',
} as const;

export interface JobPilotBridge {
  platform: string;
  documents: { save(name: string, bytes: Uint8Array): Promise<boolean> };
  theme: {
    get(): Promise<ThemeState>;
    set(source: ThemeSource): Promise<ThemeState>;
    onChange(listener: (state: ThemeState) => void): () => void;
  };
}
