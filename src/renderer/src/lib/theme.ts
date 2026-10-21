import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ThemeSource, ThemeState } from '../../../shared/ipc';
import { resolveTheme } from './theme-state';
import { transitionTheme } from './theme-transition';

const THEME_KEY = 'jobpilot.appearance';
const THEME_EVENT = 'jobpilot:appearance-changed';
const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

function browserTheme(): ThemeState {
  let source: ThemeSource = 'system';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') source = saved;
  } catch {
    /* An unavailable preference store still permits the system theme. */
  }
  return resolveTheme(source, prefersDark());
}

/** Native theme is authoritative in Electron; browser previews share the same three choices. */
export function useTheme(): {
  state: ThemeState;
  setSource: (source: ThemeSource) => void;
  error: string;
} {
  const [state, setState] = useState<ThemeState>(browserTheme);
  const [error, setError] = useState('');
  useEffect(() => {
    const bridge = window.jobpilot;
    if (!bridge) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onMedia = () => setState((s) => resolveTheme(s.source, media.matches));
      const onPreference = (event: Event) => setState((event as CustomEvent<ThemeState>).detail ?? browserTheme());
      media.addEventListener('change', onMedia);
      window.addEventListener(THEME_EVENT, onPreference);
      window.addEventListener('storage', onPreference);
      return () => {
        media.removeEventListener('change', onMedia);
        window.removeEventListener(THEME_EVENT, onPreference);
        window.removeEventListener('storage', onPreference);
      };
    }
    let live = true;
    void bridge.theme
      .get()
      .then((s) => {
        if (live) setState(s);
      })
      .catch(() => {
        if (live) setError('Could not load appearance.');
      });
    const off = bridge.theme.onChange((s) => {
      if (live) setState(s);
    });
    return () => {
      live = false;
      off();
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.dark);
  }, [state.dark]);
  const setSource = (source: ThemeSource) => {
    if (source === state.source) return;
    setError('');
    transitionTheme(async () => {
      if (window.jobpilot) {
        try {
          const next = await window.jobpilot.theme.set(source);
          flushSync(() => setState(next));
        } catch {
          setError('Could not save appearance. Please try again.');
        }
      } else {
        try {
          localStorage.setItem(THEME_KEY, source);
        } catch {
          setError('Appearance changed, but could not be saved on this device.');
        }
        const next = resolveTheme(source, prefersDark());
        flushSync(() => {
          setState(next);
          window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
        });
      }
    });
  };
  return { state, setSource, error };
}
