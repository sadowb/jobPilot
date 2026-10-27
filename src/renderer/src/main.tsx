import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setProfileData } from './features/profile/profileStorage';
import { initializeProfile } from './features/profile/startMigration';
import { App } from './app/App';
import { connectDataEvents } from './lib/api';
import { queryClient } from './lib/query';
import { WINDOW_LAYOUT } from '../../shared/window-layout';
import './styles/index.css';

window.addEventListener('error', (event) => {
  void window.jobpilot
    ?.reportRendererError({
      kind: 'error',
      message: event.message || 'Renderer error',
      stack: event.error instanceof Error ? event.error.stack : undefined,
    })
    .catch(() => undefined);
});
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : undefined;
  void window.jobpilot
    ?.reportRendererError({
      kind: 'unhandledrejection',
      message: error?.message ?? String(event.reason),
      stack: error?.stack,
    })
    .catch(() => undefined);
});

document.documentElement.dataset.platform = window.jobpilot?.platform ?? 'web';
document.documentElement.style.setProperty(
  '--app-toolbar-height',
  `${window.jobpilot?.platform === 'darwin' ? WINDOW_LAYOUT.macToolbarHeight : WINDOW_LAYOUT.webToolbarHeight}px`,
);

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
root.className =
  'motion-reduce:animate-none! motion-reduce:duration-[120ms]! motion-reduce:**:animate-none! motion-reduce:**:duration-[120ms]!';
const reactRoot = createRoot(root);
connectDataEvents();
async function start(): Promise<void> {
  reactRoot.render(<p role="status">Loading your profile…</p>);
  try {
    if (window.jobpilot && !location.hash.includes('/recovery')) {
      const profile = await initializeProfile(window.jobpilot.profile, localStorage);
      setProfileData(profile);
      if (profile.personal === null && (!location.hash || location.hash === '#/')) location.replace('#/welcome/1');
    }
    reactRoot.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>,
    );
  } catch {
    reactRoot.render(
      <div role="alert">
        <p>Could not load your profile. Your saved information has been kept. Please retry.</p>
        <button onClick={() => void start()}>Retry</button>
      </div>,
    );
  }
}
void start();
