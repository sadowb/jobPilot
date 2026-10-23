import { app, BrowserWindow, dialog } from 'electron';
import { chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { applicationsHandlers } from '../modules/applications/applications.controller';
import { postingsHandlers } from '../modules/postings/postings.controller';
import { profileHandlers } from '../modules/profile/profile.controller';
import { documentsHandlers } from '../modules/documents/documents.controller';
import { observabilityHandlers } from '../modules/observability/observability.controller';
import { initLogService, loggerFor } from '../modules/observability/log.service';
import { recoveryHandlers, settingsHandlers } from '../modules/settings/settings.controller';
import { broadcastThemeChanges, loadTheme } from '../modules/settings/settings.service';
import { DatabaseUnlockError, openDatabase } from '../platform/db/database';
import { originCheck, registerIpc } from '../platform/ipc/registry';
import { waitForRecovery } from '../modules/settings/recovery.service';
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

    serveRenderer();
    denyPermissionsByDefault();
    registerIpc(recoveryHandlers, originCheck(isTrustedUrl));
    let recoveryWindow: BrowserWindow | undefined;
    try {
      try {
        await openDatabase(loggerFor('database'));
      } catch (error) {
        if (!(error instanceof DatabaseUnlockError)) throw error;
        const recovered = waitForRecovery();
        recoveryWindow = createWindow('/recovery');
        recoveryWindow.on('closed', () => app.quit());
        await recovered;
        await openDatabase(loggerFor('database'));
      }
    } catch (error) {
      logger.fatal({ err: error }, 'Encrypted database could not be opened');
      await dialog.showMessageBox({
        type: 'error',
        title: 'JobPilot database error',
        message: 'JobPilot could not safely open its encrypted database. No database files were replaced.',
        detail: 'Restore a backup if the database is damaged. Your database files have been kept.',
      });
      app.quit();
      return;
    }

    const themePreference = join(app.getPath('userData'), 'theme-preference');
    if (existsSync(themePreference)) chmodSync(themePreference, 0o600);
    loadTheme();
    registerIpc(
      [
        ...settingsHandlers,
        ...documentsHandlers,
        ...observabilityHandlers,
        ...postingsHandlers,
        ...applicationsHandlers,
        ...profileHandlers,
      ],
      originCheck(isTrustedUrl),
    );
    broadcastThemeChanges();
    createWindow();
    if (recoveryWindow) {
      recoveryWindow.removeAllListeners('closed');
      recoveryWindow.close();
    }
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// shortcut: exposed for the inspector-only E2E harness; shipped builds have the inspector fuse off, so unreachable. Move to a test entry if the fuse policy changes.
export { loggerFor } from '../modules/observability/log.service';
export { RunTraceService } from '../modules/observability/observability.service';
