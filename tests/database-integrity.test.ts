import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ userData: '', key: undefined as Buffer | undefined }));
vi.mock('electron', () => ({
  app: { getPath: () => state.userData, getAppPath: () => process.cwd(), isPackaged: false },
}));
// Stands in for safeStorage: same contract as getDatabaseKey, held in memory.
vi.mock('../src/main/platform/secrets/db-key', () => ({
  getDatabaseKey: (create = false) => {
    if (state.key) return Promise.resolve({ key: Buffer.from(state.key), created: false });
    if (!create) return Promise.reject(new Error('missing key'));
    state.key = randomBytes(32);
    return Promise.resolve({ key: Buffer.from(state.key), created: true });
  },
  storeDatabaseKey: (key: Buffer) => {
    state.key = Buffer.from(key);
    return Promise.resolve();
  },
}));

import {
  backupAndCloseDatabase,
  DatabaseDamagedError,
  DatabaseUnlockError,
  db,
  listBackups,
  openDatabase,
  pruneBackups,
  restoreBackup,
  startDailyBackups,
} from '../src/main/platform/db/database';

const logger = { error: vi.fn() };
const roots: string[] = [];
const file = () => join(state.userData, 'jobpilot.db');
const backups = () => join(state.userData, 'backups');

async function createHealthyDatabase(): Promise<void> {
  await openDatabase(logger);
  db.$client.close();
}

function overwrite(path: string, offset: number, bytes: Buffer): void {
  const fd = openSync(path, 'r+');
  writeSync(fd, bytes, 0, bytes.length, offset);
  closeSync(fd);
}

beforeEach(() => {
  state.userData = mkdtempSync(join(tmpdir(), 'jobpilot-db-test-'));
  state.key = undefined;
  roots.push(state.userData);
});
afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('openDatabase integrity (QA N1, N2, F3, N5)', () => {
  it('creates and reopens a healthy database', async () => {
    await createHealthyDatabase();
    await createHealthyDatabase();
    expect(statSync(file()).size).toBeGreaterThan(0);
  });

  it('rejects a 0-byte file without migrating or backing up', async () => {
    state.key = randomBytes(32);
    writeFileSync(file(), '');
    await expect(openDatabase(logger)).rejects.toMatchObject({ reason: 'empty' });
    expect(statSync(file()).size).toBe(0);
    expect(existsSync(backups())).toBe(false);
  });

  it('rejects a database with a corrupted page and leaves it untouched', async () => {
    await createHealthyDatabase();
    overwrite(file(), 8192, randomBytes(512));
    const before = readFileSync(file());
    await expect(openDatabase(logger)).rejects.toBeInstanceOf(DatabaseDamagedError);
    expect(readFileSync(file()).equals(before)).toBe(true);
  });

  it('reports garbage in the header as wrong key or damaged file', async () => {
    await createHealthyDatabase();
    overwrite(file(), 0, randomBytes(100));
    await expect(openDatabase(logger)).rejects.toBeInstanceOf(DatabaseUnlockError);
  });

  it('reports a missing database whose key exists, without creating one', async () => {
    state.key = randomBytes(32);
    await expect(openDatabase(logger)).rejects.toMatchObject({ reason: 'missing' });
    expect(existsSync(file())).toBe(false);
  });
});

describe('pruneBackups temp files (F4)', () => {
  it('removes stale *.tmp but keeps recent ones', () => {
    mkdirSync(backups(), { recursive: true });
    const stale = join(backups(), 'jobpilot-2026-01-01.db.123.tmp');
    const recent = join(backups(), 'jobpilot-2026-01-02.db.456.tmp');
    writeFileSync(stale, 'x');
    writeFileSync(recent, 'x');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    utimesSync(stale, twoHoursAgo, twoHoursAgo);
    pruneBackups();
    expect(existsSync(stale)).toBe(false);
    expect(existsSync(recent)).toBe(true);
  });
});

describe('restoreBackup', () => {
  it('backs up a brand-new profile after migrating, so day one is restorable', async () => {
    await createHealthyDatabase();
    const all = listBackups();
    expect(all.map((b) => b.name)).toEqual([expect.stringMatching(/^jobpilot-\d{4}-\d{2}-\d{2}\.db$/)]);
    await expect(restoreBackup(all[0]!.name)).resolves.toBeUndefined();
  });

  it('keeps the damaged file aside and installs the backup', async () => {
    await createHealthyDatabase();
    const backup = listBackups()[0]!;
    expect(backup).toBeDefined();
    overwrite(file(), 8192, randomBytes(512));
    const damaged = readFileSync(file());

    await restoreBackup(backup.name);

    const aside = readdirSync(state.userData).filter((name) => name.startsWith('jobpilot.db.damaged-'));
    expect(aside).toHaveLength(1);
    expect(readFileSync(join(state.userData, aside[0]!)).equals(damaged)).toBe(true);
    expect(readdirSync(state.userData).some((name) => name.endsWith('.restore.tmp'))).toBe(false);
    await createHealthyDatabase();
  });

  it('refuses a backup that does not open with the key, changing nothing', async () => {
    await createHealthyDatabase();
    const backup = listBackups()[0]!;
    const before = readFileSync(file());
    const wrongKey = randomBytes(32).toString('base64');
    await expect(restoreBackup(backup.name, wrongKey)).rejects.toThrow();
    expect(readFileSync(file()).equals(before)).toBe(true);
    expect(readdirSync(state.userData).some((name) => name.includes('.damaged-'))).toBe(false);
  });

  it('rejects names that are not backups', async () => {
    await expect(restoreBackup('../jobpilot.db')).rejects.toThrow('Unknown backup.');
  });
});

describe('backupAndCloseDatabase (PERS-N3)', () => {
  const today = () => `jobpilot-${new Date().toISOString().slice(0, 10)}.db`;
  const note = () =>
    db.$client.prepare("SELECT value FROM settings WHERE key = 'note'").pluck().get() as string | undefined;

  it("refreshes today backup on close so a same-day restore keeps the day's writes", async () => {
    await openDatabase(logger);
    db.$client.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('note', 'sara', 0)").run();
    await backupAndCloseDatabase(logger);
    expect(readdirSync(backups()).filter((n) => n.endsWith('.tmp'))).toEqual([]);

    await restoreBackup(today());
    await openDatabase(logger);
    expect(note()).toBe('sara');
    db.$client.close();
  });

  it('leaves the existing backup untouched when the database fails its integrity check', async () => {
    await openDatabase(logger);
    const before = readFileSync(join(backups(), today()));
    db.$client.pragma('wal_checkpoint(TRUNCATE)');
    db.$client.pragma('cache_size = 0'); // force quick_check to read the damaged pages from disk
    overwrite(file(), 8192, randomBytes(2048));
    await backupAndCloseDatabase(logger);
    expect(readFileSync(join(backups(), today())).equals(before)).toBe(true);
    expect(logger.error).toHaveBeenCalled();
    expect(db.$client.open).toBe(false);
  });
});

describe('hourly backup refresh (N3)', () => {
  const todayFile = () => join(backups(), `jobpilot-${new Date().toISOString().slice(0, 10)}.db`);
  const tick = async () => {
    const { timer, stop } = startDailyBackups(logger);
    try {
      await (timer as unknown as { _onTimeout: () => Promise<void> })._onTimeout();
    } finally {
      stop();
    }
  };
  const write = (value: string) =>
    db.$client.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('note', ?, 0)").run(value);

  it('refreshes after a change, skips when unchanged, and keeps a good backup when damaged', async () => {
    await openDatabase(logger);
    const opened = readFileSync(todayFile());
    await tick();
    expect(readFileSync(todayFile()).equals(opened)).toBe(true); // unchanged: not rewritten

    write('sara');
    await tick();
    const refreshed = readFileSync(todayFile());
    expect(refreshed.equals(opened)).toBe(false);
    await tick();
    expect(readFileSync(todayFile()).equals(refreshed)).toBe(true); // unchanged since refresh

    write('sara2');
    db.$client.pragma('wal_checkpoint(TRUNCATE)');
    db.$client.pragma('cache_size = 0');
    overwrite(file(), 8192, randomBytes(2048));
    await tick();
    expect(readFileSync(todayFile()).equals(refreshed)).toBe(true);
    expect(logger.error).toHaveBeenCalled();
    db.$client.close();
  });
});
