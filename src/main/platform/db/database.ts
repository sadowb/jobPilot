import { app } from 'electron';
import Database from 'better-sqlite3';
import type { Logger } from '../logging/types';
import { z } from 'zod';
import { RecoveryKeySchema } from '../../../shared/ipc';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { chmodSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
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

function pruneBackups(): void {
  const files = readdirSync(backupDirectory());
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

export class DatabaseUnlockError extends Error {}

export async function recoverDatabaseKey(encoded: string): Promise<void> {
  const key = Buffer.from(RecoveryKeySchema.parse(encoded), 'base64');
  try {
    const check = new Database(databasePath(), { readonly: true, fileMustExist: true }) as SqliteDatabase;
    try {
      check.pragma("cipher='sqlcipher'");
      check.key(key);
      check.prepare('SELECT count(*) FROM sqlite_schema').get();
    } finally {
      check.close();
    }
    await storeDatabaseKey(key);
  } finally {
    key.fill(0);
  }
}

export async function openDatabase(logger: Pick<Logger, 'error'>): Promise<void> {
  const directory = app.getPath('userData');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const file = databasePath();
  const existed = existsSync(file);
  let key: Buffer;
  let keyCreated: boolean;
  try {
    ({ key, created: keyCreated } = await getDatabaseKey(!existed));
  } catch {
    if (existed) throw new DatabaseUnlockError('Use your recovery key to unlock the existing database.');
    throw new Error('OS secure storage could not provide a database key.');
  }
  if (!existed && !keyCreated) {
    throw new Error(
      'The encrypted database file is missing but its stored key exists. Restore a backup before continuing.',
    );
  }
  const sqlite = new Database(file, { fileMustExist: existed }) as SqliteDatabase;
  try {
    try {
      sqlite.pragma("cipher='sqlcipher'");
      sqlite.key(key);
      sqlite.prepare('SELECT count(*) FROM sqlite_schema').get();
    } catch {
      throw new DatabaseUnlockError('The stored key could not unlock the database. Use your recovery key.');
    }
    chmodSync(file, 0o600);
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('journal_mode = WAL');

    const migrationFolder = migrationsPath();
    const pending = pendingMigrations(sqlite, migrationFolder);
    const today = backupDay();
    if (pending) await createBackup(sqlite, key, `${today}-migration-${Date.now()}`, logger);
    await backupToday(sqlite, key, today, logger);

    db = drizzle(sqlite, { schema });
    if (pending) migrate(db, { migrationsFolder: migrationFolder });
  } catch (error) {
    sqlite.close();
    throw error;
  } finally {
    key.fill(0);
  }
}
