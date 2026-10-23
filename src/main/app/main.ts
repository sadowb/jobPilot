import { app, BrowserWindow, dialog } from 'electron';
import { chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { documentsHandlers } from '../modules/documents/documents.controller';
import { observabilityHandlers } from '../modules/observability/observability.controller';
import { initLogService, loggerFor } from '../modules/observability/log.service';
import { settingsHandlers } from '../modules/settings/settings.controller';
import { broadcastThemeChanges, loadTheme } from '../modules/settings/settings.service';
import { openDatabase } from '../platform/db/database';
import { originCheck, registerIpc } from '../platform/ipc/registry';
import { isTrustedUrl } from './env';
import { registerAppScheme, serveRenderer } from './protocol';
import { denyPermissionsByDefault, lockDown } from './security';
import { createWindow } from './window';

registerAppScheme();
process.umask(0o077);

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

  void app.whenReady().then(async () => {
    initLogService();
    const logger = loggerFor('main');
    process.on('uncaughtException', (error) => {
      logger.fatal({ err: error }, 'Uncaught main-process exception');
      app.quit();
    });
    process.on('unhandledRejection', (reason) => {
      logger.error({ err: reason instanceof Error ? reason : String(reason) }, 'Unhandled main-process rejection');
    });

    try {
      await openDatabase();
    } catch (error) {
      logger.fatal({ err: error }, 'Encrypted database could not be opened');
      await dialog.showMessageBox({
        type: 'error',
        title: 'JobPilot database error',
        message: 'JobPilot could not safely open its encrypted database. No database files were replaced.',
        detail: error instanceof Error ? error.message : String(error),
      });
      app.quit();
      return;
    }

    serveRenderer();
    denyPermissionsByDefault();
    const themePreference = join(app.getPath('userData'), 'theme-preference');
    if (existsSync(themePreference)) chmodSync(themePreference, 0o600);
    loadTheme();
    registerIpc([...settingsHandlers, ...documentsHandlers, ...observabilityHandlers], originCheck(isTrustedUrl));
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
