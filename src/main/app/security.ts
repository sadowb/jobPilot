import { session, shell, type WebContents } from 'electron';
import { loggerFor } from '../modules/observability/log.service';
import { APP_ORIGIN, rendererDevUrl } from './env';

/** Only https links leave the app, and only to the system browser. */
function openExternal(url: string): void {
  try {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url); /* eng-disable OPEN_EXTERNAL_JS_CHECK */
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

export function denyPermissionsByDefault(): void {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  // Legitimate saves go through documents.save (native save dialog); a renderer-triggered download must not write silently.
  session.defaultSession.on('will-download', (event, item) => {
    event.preventDefault();
    loggerFor('security').warn({ mime: item.getMimeType() }, 'Blocked renderer-initiated download');
  });
}
