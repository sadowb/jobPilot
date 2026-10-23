import { clipboard, dialog, type BrowserWindow } from 'electron';
import { getDatabaseKey } from '../../platform/secrets/db-key';
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
    const confirmation = await dialog.showMessageBox(window, {
      type: 'warning',
      title: 'Export recovery key',
      message: 'Show the key that unlocks your database and its backups?',
      detail: 'Anyone with this key and your database can read it. Save it in your main Bitwarden vault.',
      buttons: ['Cancel', 'Show recovery key'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (confirmation.response !== 1) return;
    const { key } = await getDatabaseKey();
    try {
      const encoded = key.toString('base64');
      const result = await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Recovery key',
        message: 'Save this recovery key in your main Bitwarden vault.',
        detail: encoded,
        buttons: ['Done', 'Copy key and close'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });
      if (result.response === 1) {
        await clipboard.writeText(encoded);
        setTimeout(() => {
          void clipboard
            .readText()
            .then(async (current) => {
              if (current === encoded) await clipboard.clear();
            })
            .catch(() => undefined);
        }, 60_000).unref();
      }
    } finally {
      key.fill(0);
    }
  } catch {
    await dialog.showMessageBox(window, {
      type: 'error',
      message: 'The recovery key could not be read. Try again when OS secure storage is available.',
    });
  } finally {
    exporting = false;
  }
}
