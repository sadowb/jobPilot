import { app, BrowserWindow, dialog } from 'electron';
import { url as inspectorUrl } from 'node:inspector';
import { db } from '../platform/db/database';
import { AgentSettingsService } from '../modules/settings/agent.service';
import { NeoBrowserProvider } from '../platform/browsers/neo';
import { FakeAgentProvider } from '../platform/agents/fake';
import { FakeBrowserProvider } from '../platform/browsers/fake';
import { FakeMemoryProvider } from '../platform/memory/fake';
import { MnemosyneMemory } from '../platform/memory/mnemosyne';
import type { MemoryProvider } from '../platform/memory/types';
import { ConsolidationWorker } from '../platform/queue/consolidate';
import { RunsService } from '../modules/runs/runs.service';
import { runsHandlers } from '../modules/runs/runs.controller';
import { chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { applicationsHandlers } from '../modules/applications/applications.controller';
import { postingsHandlers } from '../modules/postings/postings.controller';
import { PostingReader } from '../modules/postings/posting-reader.service';
import { profileHandlers } from '../modules/profile/profile.controller';
import { documentsHandlers } from '../modules/documents/documents.controller';
import { observabilityHandlers } from '../modules/observability/observability.controller';
import {
  initCrashReporting,
  installCrashHandlers,
  startSession,
  watchContents,
} from '../modules/observability/diagnostics.service';
import { closeLogs, initLogService, loggerFor } from '../modules/observability/log.service';
import { removeAllData } from '../modules/settings/remove-data.service';
import { removeKeychainItem, usesOsKeychain } from '../platform/secrets/keychain';
import { rm } from 'node:fs/promises';
import {
  agentHandlers,
  claudeKeyHandlers,
  dataHandlers,
  memoryHandlers,
  recoveryHandlers,
  settingsHandlers,
} from '../modules/settings/settings.controller';
import { MemorySettingsService } from '../modules/settings/memory.service';
import {
  broadcastThemeChanges,
  claudeKeyService,
  lastConsolidation,
  loadTheme,
  markConsolidated,
} from '../modules/settings/settings.service';
import {
  backupAndCloseDatabase,
  closeDatabase,
  DataFolderNotWritableError,
  DatabaseDamagedError,
  DatabaseUnlockError,
  openDatabase,
  startDailyBackups,
} from '../platform/db/database';
import { originCheck, registerIpc } from '../platform/ipc/registry';
import { waitForRecovery } from '../modules/settings/recovery.service';
import { isTrustedUrl } from './env';
import { installAppMenu } from './menu';
import { registerAppScheme, serveRenderer } from './protocol';
import { denyPermissionsByDefault, lockDown } from './security';
import { createWindow } from './window';
import { setTimeout as delay } from 'node:timers/promises';

const UNWRITABLE = 'JobPilot cannot write to its data folder. Make the folder writable, then start JobPilot again.';

// Inspector-only journey access follows the exports below; shipped builds disable the inspector.
export let databaseBackupTimer: NodeJS.Timeout | undefined;

let runsService: RunsService;
export let agentSettings: AgentSettingsService;
export let fakeAgent: FakeAgentProvider | undefined;
export let fakeBrowser: FakeBrowserProvider | undefined;
export let fakeMemory: FakeMemoryProvider | undefined;
export let consolidation: ConsolidationWorker;

process.umask(0o077);
// Before ready, so startup failures and crashes are on disk. A read-only profile folder fails here, before any window.
let logsError: unknown;
try {
  initLogService();
  initCrashReporting();
  installCrashHandlers();
} catch (error) {
  logsError = error;
}
registerAppScheme();

// No window exists yet on these paths, so a dialog is the only way the user learns why the app closed.
const failStartup = (error: unknown, message: string): void => {
  try {
    loggerFor('main').fatal({ err: error }, 'Startup failed');
  } catch {
    // The log directory may be the very thing that is unwritable.
  }
  dialog.showErrorBox('JobPilot could not start', `${message}\nYour data folder: ${app.getPath('userData')}`);
  app.exit(1);
};

// One instance only; a second launch focuses the first.
if (logsError) {
  void app.whenReady().then(() => failStartup(logsError, UNWRITABLE));
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  startSession();
  app.on('web-contents-created', (_event, contents) => {
    lockDown(contents);
    watchContents(contents);
  });

  void app
    .whenReady()
    .then(async () => {
      const logger = loggerFor('main');

      serveRenderer();
      installAppMenu();
      denyPermissionsByDefault();
      registerIpc(recoveryHandlers, originCheck(isTrustedUrl), loggerFor('ipc'));
      let recoveryWindow: BrowserWindow | undefined;
      try {
        try {
          await openDatabase(loggerFor('database'));
        } catch (error) {
          if (!(error instanceof DatabaseUnlockError || error instanceof DatabaseDamagedError)) throw error;
          const recovered = waitForRecovery(error instanceof DatabaseDamagedError ? error.reason : 'unlock');
          recoveryWindow = createWindow('/recovery');
          recoveryWindow.on('closed', () => app.quit());
          await recovered;
          await openDatabase(loggerFor('database'));
        }
      } catch (error) {
        failStartup(
          error,
          error instanceof DataFolderNotWritableError
            ? UNWRITABLE
            : 'JobPilot could not safely open its encrypted database. No database files were replaced.',
        );
        return;
      }

      const backups = startDailyBackups(loggerFor('database'));
      databaseBackupTimer = backups.timer;

      // An active Node inspector requires the fuse enabled; shipped apps cannot enter this branch.
      if (process.env.JOBPILOT_E2E_PROVIDER === 'fake' && (!app.isPackaged || inspectorUrl() !== undefined)) {
        fakeMemory = new FakeMemoryProvider(app.getPath('userData'), () => consolidation.start());
        fakeAgent = new FakeAgentProvider(fakeMemory);
        fakeBrowser = new FakeBrowserProvider();
      }
      const memory: MemoryProvider =
        fakeMemory ??
        new MnemosyneMemory(app.getPath('userData'), {
          logger: loggerFor('memory'),
          onReady: () => consolidation.start(),
        });
      consolidation = new ConsolidationWorker(
        (signal) => memory.consolidate(signal),
        (error) =>
          loggerFor('memory').error(
            { error_class: error instanceof Error ? error.constructor.name : 'Unknown' },
            'Memory consolidation failed',
          ),
        { get: () => lastConsolidation(db), set: (at) => markConsolidated(db, at) },
      );
      if (memory.status().state === 'ready') consolidation.start();
      agentSettings = new AgentSettingsService(db, app.getPath('userData'), app.isPackaged);
      const agent = fakeAgent ?? agentSettings;
      const browser = fakeBrowser ?? new NeoBrowserProvider(loggerFor('browser'));
      runsService = new RunsService(db, app.getPath('userData'), agent, browser, memory);
      const postingReader = new PostingReader(agent, browser);
      await runsService.initialize();
      // Stops owned work (agent children, Neo tabs, timers) once, bounded so a stuck stop cannot keep the app alive.
      let stopping: Promise<void> | undefined;
      const stopOwnedWork = () =>
        (stopping ??= (async () => {
          backups.stop();
          agentSettings.stop();
          await Promise.race([
            Promise.allSettled([runsService.stop(), postingReader.stop(), consolidation.stop(), memory.stop()]).then(
              (results) =>
                results.forEach((result, index) => {
                  if (result.status === 'rejected')
                    logger.error(
                      { step: ['runs', 'posting reader', 'consolidation', 'memory'][index] },
                      'Quit cleanup failed',
                    );
                }),
            ),
            delay(10_000),
          ]);
        })());
      // Packaged only: in development the Keychain item belongs to the generic Electron app, not JobPilot.
      const removeEverything = () =>
        removeAllData({
          log: () => logger.warn('Remove all JobPilot data requested'),
          stopOwnedWork,
          closeDatabase,
          closeLogs,
          deleteUserData: () =>
            rm(app.getPath('userData'), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }),
          removeKeychainItem: () =>
            app.isPackaged && usesOsKeychain(process.platform, app.commandLine)
              ? removeKeychainItem(app.getName())
              : Promise.resolve('skipped'),
          exit: (code) => app.exit(code),
        });
      app.on('before-quit', (event) => {
        event.preventDefault();
        // app.exit() emits no further quit events, so the quit is never re-entered.
        if (!stopping)
          void stopOwnedWork()
            .then(() => backupAndCloseDatabase(loggerFor('database')))
            .finally(() => app.exit(0));
      });
      // Windows sends no before-quit on shutdown/logoff (Electron app.md); session-end is the last chance to stop
      // agent children. Aborts and kills run synchronously inside stop(); the OS then ends the process.
      app.on('browser-window-created', (_event, window) => window.on('session-end', () => void stopOwnedWork()));

      const themePreference = join(app.getPath('userData'), 'theme-preference');
      if (existsSync(themePreference)) chmodSync(themePreference, 0o600);
      loadTheme();
      registerIpc(
        [
          ...runsHandlers(runsService),
          ...settingsHandlers,
          ...dataHandlers(removeEverything),
          ...agentHandlers(agentSettings),
          ...memoryHandlers(new MemorySettingsService(memory)),
          ...claudeKeyHandlers(claudeKeyService(db)),
          ...documentsHandlers,
          ...observabilityHandlers,
          ...postingsHandlers(postingReader),
          ...applicationsHandlers,
          ...profileHandlers,
        ],
        originCheck(isTrustedUrl),
        loggerFor('ipc'),
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
    })
    .catch((error: unknown) => failStartup(error, 'JobPilot hit an unexpected error while starting.'));

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// shortcut: exposed for the inspector-only E2E harness; shipped builds have the inspector fuse off, so unreachable. Move to a test entry if the fuse policy changes.
export { loggerFor } from '../modules/observability/log.service';
export { RunTraceService } from '../modules/observability/observability.service';
export { db } from '../platform/db/database';

export { RunResultSchema } from '../platform/agents/types';
