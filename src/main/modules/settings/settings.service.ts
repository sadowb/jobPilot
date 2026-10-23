import { app, BrowserWindow, nativeTheme } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Channels } from '../../../shared/ipc';
import { ThemeSourceSchema, type ThemeSource, type ThemeState } from '../../../shared/dto';

// Phase 1 moves this into the `settings` table.
const themeFile = () => join(app.getPath('userData'), 'theme-preference');

export const themeState = (): ThemeState => ({
  source: nativeTheme.themeSource,
  dark: nativeTheme.shouldUseDarkColors,
});

export function loadTheme(): void {
  try {
    const saved = ThemeSourceSchema.safeParse(readFileSync(themeFile(), 'utf8').trim());
    if (saved.success) nativeTheme.themeSource = saved.data;
  } catch {
    /* First launch or an unreadable preference uses the system appearance. */
  }
}

export function setTheme(source: ThemeSource): ThemeState {
  writeFileSync(themeFile(), source, 'utf8');
  nativeTheme.themeSource = source;
  return themeState();
}

export function broadcastThemeChanges(): void {
  nativeTheme.on('updated', () => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(Channels.themeChanged, themeState());
  });
}
