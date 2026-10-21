import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { WINDOW_LAYOUT } from '../../shared/window-layout';
import './styles/index.css';
import './styles/window.css';

document.documentElement.dataset.platform = window.jobpilot?.platform ?? 'web';
document.documentElement.style.setProperty(
  '--app-toolbar-height',
  `${window.jobpilot?.platform === 'darwin' ? WINDOW_LAYOUT.macToolbarHeight : WINDOW_LAYOUT.webToolbarHeight}px`,
);

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
