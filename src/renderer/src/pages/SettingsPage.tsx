import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsBackdrop } from '../features/settings/SettingsBackdrop';
import { SettingsSheet } from '../features/settings/SettingsSheet';

/** /settings: the sheet over a dimmed dashboard. Close returns to the screen it was opened from. */
export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => void (location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1));

  // The sheet is a modal <dialog>: it owns Esc, the backdrop click and the scrim.
  return (
    <div className="flex h-[calc(100vh-var(--app-toolbar-height))] min-h-[560px] flex-col">
      <SettingsBackdrop />
      <SettingsSheet onClose={close} />
    </div>
  );
}
