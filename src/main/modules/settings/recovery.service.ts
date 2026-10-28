import { app, dialog, type BrowserWindow } from 'electron';
import type { z } from 'zod';
import type { RecoveryState, RestoreBackupSchema } from '../../../shared/ipc';
import { loggerFor } from '../observability/log.service';
import { showRecoveryKey } from '../../platform/secrets/db-key';
import { listBackups, recoverDatabaseKey, restoreBackup } from '../../platform/db/database';

let finishRecovery: (() => void) | undefined;
let recovering = false;
let exporting = false;

let reason: RecoveryState['reason'] = 'unlock';

export function waitForRecovery(why: RecoveryState['reason']): Promise<void> {
  reason = why;
  return new Promise((resolve) => {
    finishRecovery = resolve;
  });
}

export async function importRecoveryKey(key: string): Promise<boolean> {
  if (!finishRecovery || recovering) return false;
  recovering = true;
  try {
    await recoverDatabaseKey(key);
    finishRecovery();
    finishRecovery = undefined;
    return true;
  } catch {
    return false;
  } finally {
    recovering = false;
  }
}

export function recoveryState(): RecoveryState {
  return { reason, backups: listBackups() };
}

/** Installs a verified backup, then relaunches so the app opens the restored database from scratch. */
export async function restoreFromBackup(input: z.output<typeof RestoreBackupSchema>): Promise<boolean> {
  if (!finishRecovery || recovering) return false;
  recovering = true;
  try {
    await restoreBackup(input.name, input.recoveryKey);
  } catch (error) {
    loggerFor('database').error(
      { error_class: error instanceof Error ? error.constructor.name : 'Unknown' },
      'Backup restore failed',
    );
    recovering = false;
    return false;
  }
  app.relaunch();
  app.exit(0);
  return true;
}

export async function exportRecoveryKey(window: BrowserWindow | null): Promise<void> {
  if (!window || exporting || finishRecovery) return;
  exporting = true;
  try {
    await showRecoveryKey(window);
  } catch {
    await dialog.showMessageBox(window, {
      type: 'error',
      message: 'The recovery key could not be read. Try again when OS secure storage is available.',
    });
  } finally {
    exporting = false;
  }
}
