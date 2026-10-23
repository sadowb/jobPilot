import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
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
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
