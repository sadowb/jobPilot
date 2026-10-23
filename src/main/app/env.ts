import { app } from 'electron';

export const rendererDevUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined;
export const isDev = Boolean(rendererDevUrl);
// The packaged renderer is served from app://jobpilot/ (not file://) so the GrantFileProtocolExtraPrivileges fuse can be off.
export const APP_ORIGIN = 'app://jobpilot';

export const isTrustedUrl = (url: URL): boolean =>
  rendererDevUrl ? url.origin === new URL(rendererDevUrl).origin : url.protocol === 'app:' && url.host === 'jobpilot';
