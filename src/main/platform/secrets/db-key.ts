import { app, safeStorage } from 'electron';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { RecoveryKeySchema } from '../../../shared/ipc';

const keyFile = () => join(app.getPath('userData'), 'db-key.enc');

async function requireSecureStorage(): Promise<void> {
  const directory = app.getPath('userData');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('OS secure storage is unavailable; JobPilot cannot unlock its database.');
  }
  if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') {
    throw new Error('A secure Linux key store is unavailable; JobPilot will not store its database key in plain text.');
  }
}

export async function getDatabaseKey(create = false): Promise<{ key: Buffer; created: boolean }> {
  await requireSecureStorage();
  const file = keyFile();
  if (existsSync(file)) {
    chmodSync(file, 0o600);
    const encrypted = z
      .instanceof(Buffer)
      .refine((bytes) => bytes.length > 0 && bytes.length <= 4096)
      .parse(readFileSync(file));
    const { result } = await safeStorage.decryptStringAsync(encrypted);
    const encodedKey = RecoveryKeySchema.parse(result);
    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== 32) throw new Error('The stored database key is invalid.');
    return { key, created: false };
  }

  if (!create) throw new Error('The database key is missing. Use your recovery key.');
  const key = randomBytes(32);
  await storeDatabaseKey(key);
  return { key, created: true };
}

export async function storeDatabaseKey(key: Buffer): Promise<void> {
  await requireSecureStorage();
  RecoveryKeySchema.parse(key.toString('base64'));
  const file = keyFile();
  const encrypted = await safeStorage.encryptStringAsync(key.toString('base64'));
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, encrypted, { mode: 0o600, flag: 'wx' });
    renameSync(temporary, file);
    chmodSync(file, 0o600);
  } finally {
    rmSync(temporary, { force: true });
  }
}
