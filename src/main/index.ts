import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol, shell, type WebContents } from 'electron';
import { basename, join, normalize, sep } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Channels, type ThemeSource, type ThemeState } from '../shared/ipc';
import { WINDOW_LAYOUT } from '../shared/window-layout';

const isDev = !app.isPackaged && Boolean(process.env.ELECTRON_RENDERER_URL);
// The packaged renderer is served from app://jobpilot/ (not file://) so the GrantFileProtocolExtraPrivileges fuse can be off.
const APP_ORIGIN = 'app://jobpilot';
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveRenderer(): void {
  const root = join(__dirname, '../renderer');
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    if (url.host !== 'jobpilot') return new Response('not found', { status: 404 });
    const relative = normalize(decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const target = join(root, relative);
    if (target !== root && !target.startsWith(root + sep)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(target).toString());
  });
}

const GROUND = { light: '#F8F8F8', dark: '#141414' } as const; // --ground, avoids a white flash on dark

const themeState = (): ThemeState => ({
  source: nativeTheme.themeSource,
  dark: nativeTheme.shouldUseDarkColors,
});

const isThemeSource = (value: unknown): value is ThemeSource =>
  value === 'system' || value === 'light' || value === 'dark';

/** Only https links leave the app, and only to the system browser. */
function openExternal(url: string): void {
  try {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url);
  } catch {
    /* malformed URL: ignore */
  }
}

function lockDown(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    const allowed = isDev ? process.env.ELECTRON_RENDERER_URL : undefined;
    const inApp = (allowed && url.startsWith(allowed)) || url.startsWith(`${APP_ORIGIN}/`);
    // Same-document hash navigation is fine; anything else leaves the app or reloads the page.
    if (inApp && new URL(url).pathname === new URL(contents.getURL()).pathname) return;
    event.preventDefault();
    if (!inApp) openExternal(url);
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    acceptFirstMouse: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? GROUND.dark : GROUND.light,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? WINDOW_LAYOUT.macTrafficLightPosition : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });
  window.once('ready-to-show', () => window.show());
  lockDown(window.webContents);

  if (isDev && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadURL(`${APP_ORIGIN}/index.html`);
  return window;
}

// One instance only; a second launch focuses the first.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.on('web-contents-created', (_event, contents) => lockDown(contents));

  void app.whenReady().then(() => {
    serveRenderer();
    const themeFile = join(app.getPath('userData'), 'theme-preference');
    try {
      const saved = readFileSync(themeFile, 'utf8').trim();
      if (isThemeSource(saved)) nativeTheme.themeSource = saved;
    } catch {
      /* First launch or an unreadable preference uses the system appearance. */
    }
    ipcMain.handle(Channels.saveDocument, async (event, name: unknown, bytes: unknown) => {
      const frame = event.senderFrame;
      const url = frame ? new URL(frame.url) : null;
      const trusted =
        url &&
        (isDev
          ? url.origin === new URL(process.env.ELECTRON_RENDERER_URL!).origin
          : url.protocol === 'app:' && url.host === 'jobpilot');
      if (
        !trusted ||
        frame !== event.sender.mainFrame ||
        typeof name !== 'string' ||
        !/\.(pdf|docx)$/i.test(name) ||
        !(bytes instanceof Uint8Array) ||
        !bytes.length ||
        bytes.length > 20 * 1024 * 1024
      ) {
        throw new TypeError('Invalid document export');
      }
      const owner = BrowserWindow.fromWebContents(event.sender);
      if (!owner) throw new Error('Document window is unavailable');
      const result = await dialog.showSaveDialog(owner, { title: 'Save a copy', defaultPath: basename(name) });
      if (result.canceled || !result.filePath) return false;
      await writeFile(result.filePath, bytes);
      return true;
    });
    ipcMain.handle(Channels.getTheme, () => themeState());
    ipcMain.handle(Channels.setTheme, (_event, source: unknown) => {
      if (!isThemeSource(source)) throw new TypeError('invalid theme source');
      writeFileSync(themeFile, source, 'utf8');
      nativeTheme.themeSource = source;
      return themeState();
    });
    nativeTheme.on('updated', () => {
      for (const window of BrowserWindow.getAllWindows()) window.webContents.send(Channels.themeChanged, themeState());
    });
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
