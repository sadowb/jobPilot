import { BrowserWindow, nativeTheme } from 'electron';
import { join } from 'node:path';
import { WINDOW_LAYOUT } from '../../shared/window-layout';
import { APP_ORIGIN, rendererDevUrl } from './env';
import { lockDown } from './security';

const GROUND = { light: '#F8F8F8', dark: '#141414' } as const; // --ground, avoids a white flash on dark

export function createWindow(route = '/'): BrowserWindow {
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

  if (rendererDevUrl) void window.loadURL(`${rendererDevUrl}#${route}`);
  else void window.loadURL(`${APP_ORIGIN}/index.html#${route}`);
  return window;
}
