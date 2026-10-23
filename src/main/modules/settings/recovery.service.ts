import { dialog, type BrowserWindow } from 'electron';
import { showRecoveryKey } from '../../platform/secrets/db-key';
import { recoverDatabaseKey } from '../../platform/db/database';

let finishRecovery: (() => void) | undefined;
let recovering = false;
let exporting = false;

export function waitForRecovery(): Promise<void> {
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
