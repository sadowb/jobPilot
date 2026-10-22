import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsBackdrop } from '../features/settings/SettingsBackdrop';
import '../styles/v17-surfaces.css'; // keyframes only (`v17Fade`)
import { SettingsSheet } from '../features/settings/SettingsSheet';

/** /settings: the sheet over a dimmed dashboard. Close returns to the screen it was opened from. */
export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => void (location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only reads location.key / navigate
  }, [location.key, navigate]);

  return (
    <div className="flex h-[calc(100vh-var(--app-toolbar-height))] min-h-[560px] flex-col">
      <SettingsBackdrop />
      <div
        className="fixed inset-0 z-1 animate-[v17Fade_0.3s_ease-out_both] bg-[rgb(0_0_0/0.25)] backdrop-blur-[8px] motion-reduce:animate-none dark:bg-[rgb(0_0_0/0.45)] in-[html[data-platform=darwin]]:top-(--app-toolbar-height)"
        aria-hidden="true"
        onClick={close}
      />
      <SettingsSheet onClose={close} />
    </div>
  );
}
