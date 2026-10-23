import { shell, type WebContents } from 'electron';
import { APP_ORIGIN, rendererDevUrl } from './env';

/** Only https links leave the app, and only to the system browser. */
function openExternal(url: string): void {
  try {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url);
  } catch {
    /* malformed URL: ignore */
  }
}

export function lockDown(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    const inApp = (rendererDevUrl && url.startsWith(rendererDevUrl)) || url.startsWith(`${APP_ORIGIN}/`);
    // Same-document hash navigation is fine; anything else leaves the app or reloads the page.
    if (inApp && new URL(url).pathname === new URL(contents.getURL()).pathname) return;
    event.preventDefault();
    if (!inApp) openExternal(url);
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}
