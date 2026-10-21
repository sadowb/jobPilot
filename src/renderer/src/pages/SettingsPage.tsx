import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsBackdrop } from '../features/settings/SettingsBackdrop';
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
    <div style={{ height: 'calc(100vh - 86px)', minHeight: 560, display: 'flex', flexDirection: 'column' }}>
      <SettingsBackdrop />
      <div
        className="scrim v17scrim"
        style={{ position: 'fixed', inset: 0, zIndex: 1 }}
        aria-hidden="true"
        onClick={close}
      />
      <SettingsSheet onClose={close} />
    </div>
  );
}
