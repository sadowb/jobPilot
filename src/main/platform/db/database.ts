import { app } from 'electron';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { chmodSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as schema from './schema';
import { getDatabaseKey } from '../secrets/db-key';

type SqliteDatabase = InstanceType<typeof Database> & { key(key: Buffer): number };

process.env.SQLITE_USE_URI = '1';

export type JobPilotDb = BetterSQLite3Database<typeof schema>;
export let db: JobPilotDb;

const databasePath = () => join(app.getPath('userData'), 'jobpilot.db');
const migrationsPath = () => join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'drizzle');
const backupDirectory = () => join(app.getPath('userData'), 'backups');

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

async function createBackup(sqlite: SqliteDatabase, key: Buffer, suffix: string): Promise<void> {
  const directory = backupDirectory();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const target = join(directory, `jobpilot-${suffix}.db`);
  const temporary = `${target}.${process.pid}.tmp`;
  try {
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
  } catch {
    rmSync(temporary, { force: true });
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

export async function openDatabase(): Promise<void> {
  const directory = app.getPath('userData');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const file = databasePath();
  const existed = existsSync(file);
  const { key, created: keyCreated } = await getDatabaseKey();
  if (!existed && !keyCreated) {
    throw new Error(
      'The encrypted database file is missing but its stored key exists. Restore a backup before continuing.',
    );
  }
  const sqlite = new Database(file, { fileMustExist: existed }) as SqliteDatabase;
  try {
    sqlite.pragma("cipher='sqlcipher'");
    sqlite.key(key);
    sqlite.prepare('SELECT count(*) FROM sqlite_schema').get();
    chmodSync(file, 0o600);
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('journal_mode = WAL');

    const migrationFolder = migrationsPath();
    const pending = pendingMigrations(sqlite, migrationFolder);
    const today = new Date().toISOString().slice(0, 10);
    const dailyBackup = join(backupDirectory(), `jobpilot-${today}.db`);
    if (pending) await createBackup(sqlite, key, `${today}-migration-${Date.now()}`);
    if (!existsSync(dailyBackup)) await createBackup(sqlite, key, today);
    pruneBackups();

    db = drizzle(sqlite, { schema });
    if (pending) migrate(db, { migrationsFolder: migrationFolder });
  } catch (error) {
    sqlite.close();
    throw error;
  }
}
