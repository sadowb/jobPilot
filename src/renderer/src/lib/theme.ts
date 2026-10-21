import { useEffect, useState } from 'react';
import type { ThemeSource, ThemeState } from '../../../shared/ipc';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Mirrors Electron's nativeTheme onto <html class="dark">. In a plain browser it follows the OS. */
export function useTheme(): { state: ThemeState; setSource: (source: ThemeSource) => void } {
  const [state, setState] = useState<ThemeState>({ source: 'system', dark: prefersDark() });

  useEffect(() => {
    const bridge = window.jobpilot;
    if (!bridge) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => setState((s) => ({ ...s, dark: media.matches }));
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    let live = true;
    void bridge.theme.get().then((s) => live && setState(s));
    const off = bridge.theme.onChange((s) => live && setState(s));
    return () => {
      live = false;
      off();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.dark);
  }, [state.dark]);

  const setSource = (source: ThemeSource) => {
    if (window.jobpilot) void window.jobpilot.theme.set(source).then(setState);
    else setState((s) => ({ ...s, source }));
  };
  return { state, setSource };
}
