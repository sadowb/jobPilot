import { app, safeStorage } from 'electron';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const keyFile = () => join(app.getPath('userData'), 'db-key.enc');

export async function getDatabaseKey(): Promise<{ key: Buffer; created: boolean }> {
  const directory = app.getPath('userData');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('OS secure storage is unavailable; JobPilot cannot unlock its database.');
  }
  if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') {
    throw new Error('A secure Linux key store is unavailable; JobPilot will not store its database key in plain text.');
  }

  const file = keyFile();
  if (existsSync(file)) {
    chmodSync(file, 0o600);
    const encrypted = z
      .instanceof(Buffer)
      .refine((bytes) => bytes.length > 0 && bytes.length <= 4096)
      .parse(readFileSync(file));
    const { result } = await safeStorage.decryptStringAsync(encrypted);
    const encodedKey = z
      .string()
      .regex(/^[A-Za-z0-9+/]{43}=$/)
      .parse(result);
    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== 32) throw new Error('The stored database key is invalid.');
    return { key, created: false };
  }

  const key = randomBytes(32);
  const encrypted = await safeStorage.encryptStringAsync(key.toString('base64'));
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, encrypted, { mode: 0o600, flag: 'wx' });
  renameSync(temporary, file);
  chmodSync(file, 0o600);
  return { key, created: true };
}
