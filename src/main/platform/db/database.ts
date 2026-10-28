import { app } from 'electron';
import Database from 'better-sqlite3';
import type { Logger } from 'pino';
import { z } from 'zod';
import { RecoveryKeySchema } from '../../../shared/ipc';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as schema from './schema';
import { getDatabaseKey, storeDatabaseKey } from '../secrets/db-key';

type SqliteDatabase = InstanceType<typeof Database> & { key(key: Buffer): number };

process.env.SQLITE_USE_URI = '1';

export type JobPilotDb = BetterSQLite3Database<typeof schema>;
export let db: JobPilotDb & { $client: Database.Database };

const databasePath = () => join(app.getPath('userData'), 'jobpilot.db');
const migrationsPath = () => join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'drizzle');
const backupDirectory = () => join(app.getPath('userData'), 'backups');
const backupDay = () => new Date().toISOString().slice(0, 10);

function pendingMigrations(sqlite: SqliteDatabase, migrationFolder: string): boolean {
  const migrations = readMigrationFiles({ migrationsFolder: migrationFolder });
  const table = sqlite
    .prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = '__drizzle_migrations'")
    .get();
  if (!table) return migrations.length > 0;
  const latest = sqlite.prepare('SELECT MAX(created_at) AS created_at FROM __drizzle_migrations').get() as {
    created_at: number | null;
  };
  return migrations.some((migration) => latest.created_at === null || latest.created_at < migration.folderMillis);
}

async function createBackup(
  sqlite: SqliteDatabase,
  key: Buffer,
  suffix: string,
  logger: Pick<Logger, 'error'>,
): Promise<void> {
  const directory = backupDirectory();
  const target = join(directory, `jobpilot-${suffix}.db`);
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const uri = new URL(pathToFileURL(temporary));
    uri.searchParams.set('cipher', 'sqlcipher');
    uri.searchParams.set('hexkey', key.toString('hex'));
    sqlite.exec(`VACUUM INTO '${uri.href.replaceAll("'", "''")}'`);

    chmodSync(temporary, 0o600);
    const check = new Database(temporary, { readonly: true, fileMustExist: true }) as SqliteDatabase;
    try {
      check.pragma("cipher='sqlcipher'");
      check.key(key);
      check.prepare('SELECT count(*) FROM sqlite_schema').get();
    } finally {
      check.close();
    }
    renameSync(temporary, target);
    chmodSync(target, 0o600);
  } catch (error) {
    const code = z.object({ code: z.string().regex(/^SQLITE_[A-Z_]+$/) }).safeParse(error);
    logger.error(
      {
        error_class:
          error instanceof Database.SqliteError ? 'SqliteError' : error instanceof Error ? 'Error' : 'Unknown',
        sqlite_status: code.success ? code.data.code : undefined,
      },
      'Encrypted database backup failed',
    );
    rmSync(temporary, { force: true });
    // The original error can contain the hexkey URI; never retain it as a cause.
    // eslint-disable-next-line preserve-caught-error
    throw new Error('Encrypted database backup could not be created or verified.');
  }
}

export function pruneBackups(): void {
  const files = readdirSync(backupDirectory());
  // A killed createBackup leaves a full encrypted copy behind; nothing live holds one for over an hour.
  for (const name of files.filter((n) => /^jobpilot-.+\.db\.\d+\.tmp$/.test(n))) {
    const path = join(backupDirectory(), name);
    if (Date.now() - statSync(path).mtimeMs > 60 * 60 * 1000) rmSync(path, { force: true });
  }
  for (const pattern of [/^jobpilot-\d{4}-\d{2}-\d{2}\.db$/, /^jobpilot-\d{4}-\d{2}-\d{2}-migration-\d+\.db$/]) {
    const sorted = files
      .filter((name) => pattern.test(name))
      .map((name) => ({ name, mtime: statSync(join(backupDirectory(), name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const { name } of sorted.slice(14)) rmSync(join(backupDirectory(), name));
  }
}

async function backupToday(
  sqlite: SqliteDatabase,
  key: Buffer,
  today: string,
  logger: Pick<Logger, 'error'>,
): Promise<void> {
  if (!existsSync(join(backupDirectory(), `jobpilot-${today}.db`))) {
    await createBackup(sqlite, key, today, logger);
  }
  pruneBackups();
}

// shortcut: hourly checks until the daily queue job lands in #19.
export function startDailyBackups(logger: Pick<Logger, 'error'>): { timer: NodeJS.Timeout; stop: () => void } {
  let inFlight = false;
  let stopped = false;
  const timer = setInterval(
    async () => {
      if (inFlight || stopped) return;
      inFlight = true;
      let key: Buffer | undefined;
      try {
        const today = backupDay();
        if (existsSync(join(backupDirectory(), `jobpilot-${today}.db`))) return;
        ({ key } = await getDatabaseKey());
        if (!stopped) await backupToday(db.$client as SqliteDatabase, key, today, logger);
      } catch (error) {
        const code = z.object({ code: z.string().regex(/^SQLITE_[A-Z_]+$/) }).safeParse(error);
        logger.error(
          {
            error_class:
              error instanceof Database.SqliteError ? 'SqliteError' : error instanceof Error ? 'Error' : 'Unknown',
            sqlite_status: code.success ? code.data.code : undefined,
          },
          'Daily database backup check failed; retrying next tick',
        );
      } finally {
        key?.fill(0);
        inFlight = false;
      }
    },
    60 * 60 * 1000,
  );
  timer.unref();
  return {
    timer,
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}

/** The stored key (or the file header) did not open the file: a wrong key and a damaged header look identical. */
export class DatabaseUnlockError extends Error {}

/** The file is empty, missing or fails integrity checks. It must never be migrated or written over. */
export class DatabaseDamagedError extends Error {
  constructor(
    message: string,
    readonly reason: 'empty' | 'corrupt' | 'missing',
  ) {
    super(message);
  }
}

function openKeyed(file: string, key: Buffer, readonly: boolean): SqliteDatabase {
  const sqlite = new Database(file, { readonly, fileMustExist: true }) as SqliteDatabase;
  try {
    sqlite.pragma("cipher='sqlcipher'");
    sqlite.key(key);
    sqlite.prepare('SELECT count(*) FROM sqlite_schema').get();
    return sqlite;
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

/** Throws DatabaseDamagedError unless the keyed file passes quick_check and has a schema. */
function assertIntact(sqlite: SqliteDatabase): void {
  let ok = false;
  try {
    ok = sqlite.pragma('quick_check', { simple: true }) === 'ok';
  } catch {
    // Page-level corruption can surface as a thrown error instead of a report.
  }
  const { n } = sqlite.prepare('SELECT count(*) AS n FROM sqlite_schema').get() as { n: number };
  if (!ok || n === 0) throw new DatabaseDamagedError('The database failed its integrity check.', 'corrupt');
}

export async function recoverDatabaseKey(encoded: string): Promise<void> {
  const key = Buffer.from(RecoveryKeySchema.parse(encoded), 'base64');
  try {
    openKeyed(databasePath(), key, true).close();
    await storeDatabaseKey(key);
  } finally {
    key.fill(0);
  }
}

export interface BackupInfo {
  name: string;
  modifiedAt: string;
  size: number;
}

const BACKUP_NAME = /^jobpilot-\d{4}-\d{2}-\d{2}(-migration-\d+)?\.db$/;

export function listBackups(): BackupInfo[] {
  if (!existsSync(backupDirectory())) return [];
  return readdirSync(backupDirectory())
    .filter((name) => BACKUP_NAME.test(name))
    .map((name) => {
      const stat = statSync(join(backupDirectory(), name));
      return { name, modifiedAt: stat.mtime.toISOString(), size: stat.size };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

/**
 * Verifies a backup against the key, moves the current database aside (never deletes it) and installs the
 * backup atomically. `encodedKey` is the user's recovery key; without it the stored key is used.
 */
export async function restoreBackup(name: string, encodedKey?: string): Promise<void> {
  if (!BACKUP_NAME.test(name)) throw new Error('Unknown backup.');
  const source = join(backupDirectory(), name);
  const key = encodedKey ? Buffer.from(RecoveryKeySchema.parse(encodedKey), 'base64') : (await getDatabaseKey()).key;
  try {
    const check = openKeyed(source, key, true);
    try {
      assertIntact(check);
    } finally {
      check.close();
    }
    if (encodedKey) await storeDatabaseKey(key);
  } finally {
    key.fill(0);
  }

  const file = databasePath();
  const aside = `${file}.damaged-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`;
  const staged = `${file}.${process.pid}.restore.tmp`;
  const moved: string[] = [];
  try {
    copyFileSync(source, staged);
    chmodSync(staged, 0o600);
    for (const suffix of ['', '-wal', '-shm']) {
      if (!existsSync(file + suffix)) continue;
      renameSync(file + suffix, aside + suffix);
      moved.push(suffix);
    }
    renameSync(staged, file);
  } catch (error) {
    for (const suffix of moved) renameSync(aside + suffix, file + suffix);
    throw error;
  } finally {
    rmSync(staged, { force: true });
  }
}

export async function openDatabase(logger: Pick<Logger, 'error'>): Promise<void> {
  const directory = app.getPath('userData');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const file = databasePath();
  const existed = existsSync(file);
  // SQLite treats a 0-byte file as a valid empty database, so any key would "unlock" it and migrations would run.
  if (existed && statSync(file).size === 0) {
    throw new DatabaseDamagedError('The database file is empty.', 'empty');
  }
  let key: Buffer;
  let keyCreated: boolean;
  try {
    ({ key, created: keyCreated } = await getDatabaseKey(!existed));
  } catch {
    if (existed) throw new DatabaseUnlockError('Use your recovery key to unlock the existing database.');
    throw new Error('OS secure storage could not provide a database key.');
  }
  try {
    if (!existed && !keyCreated) {
      throw new DatabaseDamagedError('The encrypted database file is missing but its stored key exists.', 'missing');
    }
    let sqlite: SqliteDatabase;
    try {
      if (existed) sqlite = openKeyed(file, key, false);
      else {
        sqlite = new Database(file) as SqliteDatabase;
        sqlite.pragma("cipher='sqlcipher'");
        sqlite.key(key);
      }
    } catch {
      throw new DatabaseUnlockError('The stored key could not unlock the database: wrong key or damaged file.');
    }
    try {
      if (existed) assertIntact(sqlite);
      chmodSync(file, 0o600);
      sqlite.pragma('foreign_keys = ON');
      sqlite.pragma('busy_timeout = 5000');
      sqlite.pragma('journal_mode = WAL');

      const migrationFolder = migrationsPath();
      const pending = pendingMigrations(sqlite, migrationFolder);
      const today = backupDay();
      // A brand-new file has nothing to roll back to; restore refuses schema-less backups anyway.
      if (pending && existed) await createBackup(sqlite, key, `${today}-migration-${Date.now()}`, logger);

      db = drizzle(sqlite, { schema });
      if (pending) migrate(db, { migrationsFolder: migrationFolder });
      // After migrating, so even a first-day backup has the current schema and stays restorable.
      await backupToday(sqlite, key, today, logger);
    } catch (error) {
      sqlite.close();
      throw error;
    }
  } finally {
    key.fill(0);
  }
}
