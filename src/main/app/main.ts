import { app, BrowserWindow } from 'electron';
import { documentsHandlers } from '../modules/documents/documents.controller';
import { settingsHandlers } from '../modules/settings/settings.controller';
import { broadcastThemeChanges, loadTheme } from '../modules/settings/settings.service';
import { originCheck, registerIpc } from '../platform/ipc/registry';
import { isTrustedUrl } from './env';
import { registerAppScheme, serveRenderer } from './protocol';
import { lockDown } from './security';
import { createWindow } from './window';

registerAppScheme();

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
    loadTheme();
    registerIpc([...settingsHandlers, ...documentsHandlers], originCheck(isTrustedUrl));
    broadcastThemeChanges();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
