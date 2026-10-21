import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSettingsShortcut } from './model';

/** Opens `/settings` on the bare ',' key. Mount once in the app shell. */
export function useSettingsShortcut(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isSettingsShortcut(e) || e.defaultPrevented) return;
      e.preventDefault();
      void navigate('/settings');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}
