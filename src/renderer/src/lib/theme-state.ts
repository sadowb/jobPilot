import type { ThemeSource, ThemeState } from '../../../shared/ipc';

export function resolveTheme(source: ThemeSource, systemDark: boolean): ThemeState {
  return { source, dark: source === 'system' ? systemDark : source === 'dark' };
}
