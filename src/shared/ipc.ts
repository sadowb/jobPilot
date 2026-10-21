/** Single source of truth for IPC channel names and payloads (imported by main, preload and renderer). */
export type ThemeSource = 'system' | 'light' | 'dark';

export const Channels = {
  getTheme: 'theme:get',
  setTheme: 'theme:set',
  themeChanged: 'theme:changed',
} as const;

export interface ThemeState {
  source: ThemeSource;
  dark: boolean;
}

export interface JobPilotBridge {
  platform: string;
  theme: {
    get(): Promise<ThemeState>;
    set(source: ThemeSource): Promise<ThemeState>;
    onChange(listener: (state: ThemeState) => void): () => void;
  };
}
