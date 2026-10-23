import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint-disable-next-line no-empty-pattern
test('launches JobPilot and verifies encrypted storage, migrations, backups, and clean logs', async ({}, testInfo) => {
  test.setTimeout(90_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-e2e-'));
  const rendererErrors: string[] = [];
  const mainStderr: string[] = [];
  const packaged = testInfo.project.name === 'packaged';
  const executablePath =
    process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot';
  let app: ElectronApplication | undefined;
  try {
    app = await electron.launch({
      ...(packaged ? { executablePath } : {}),
      args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
      timeout: 60_000,
    });
    app.process().stderr?.on('data', (chunk: Buffer) => mainStderr.push(chunk.toString()));
    let window: Page;
    try {
      window = await app.firstWindow({ timeout: 15_000 });
    } catch (error) {
      const startupState = await Promise.race([
        app.evaluate(({ app }) => {
          const path = process.getBuiltinModule('node:path')!;
          const createRequire = process.getBuiltinModule('node:module')!.createRequire;
          const nodeRequire = createRequire(path.join(app.getAppPath(), 'package.json'));
          const { BrowserWindow } = nodeRequire('electron') as typeof import('electron');
          return BrowserWindow.getAllWindows().map((item) => ({
            url: item.webContents.getURL(),
            loading: item.webContents.isLoading(),
            visible: item.isVisible(),
          }));
        }),
        new Promise((resolve) => setTimeout(() => resolve('main process did not answer'), 3_000)),
      ]);
      testInfo.annotations.push({ type: 'startup-state', description: JSON.stringify(startupState) });
      throw error;
    }
    window.on('console', (msg) => {
      if (msg.type() === 'error') rendererErrors.push(msg.text());
    });
    window.on('pageerror', (error) => rendererErrors.push(error.message));
    await window.waitForLoadState('domcontentloaded', { timeout: 15_000 });

    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    expect(await window.evaluate(() => typeof window.jobpilot)).toBe('object');

    const isDark = () => window.evaluate(() => document.documentElement.classList.contains('dark'));
    const toggle = window.getByRole('button', { name: /Switch to (dark|light) mode/ });
    const startDark = await isDark();
    await toggle.click();
    await expect.poll(isDark).toBe(!startDark);
    await toggle.click();
    await expect.poll(isDark).toBe(startDark);
    for (const route of ['#/profile', '#/settings', '#/']) {
      await window.evaluate((hash) => (location.hash = hash), route);
      await expect.poll(() => window.evaluate(() => location.hash)).toBe(route);
      await expect(window.locator('#root')).not.toBeEmpty();
    }

    const state = await app.evaluate(({ app }) => {
      const fs = process.getBuiltinModule('node:fs')!;
      const path = process.getBuiltinModule('node:path')!;
      const createRequire = process.getBuiltinModule('node:module')!.createRequire;
      const nodeRequire = createRequire(path.join(app.getAppPath(), 'package.json'));
      const Database = nodeRequire('better-sqlite3') as typeof import('better-sqlite3');
      const { safeStorage } = nodeRequire('electron') as typeof import('electron');
      const userData = app.getPath('userData');
      const readFiles = (directory: string): string[] =>
        fs.existsSync(directory)
          ? fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
              const file = path.join(directory, entry.name);
              return entry.isDirectory() ? readFiles(file) : [file];
            })
          : [];
      const dbFile = path.join(userData, 'jobpilot.db');
      const backupDirectory = path.join(userData, 'backups');
      const backups = fs.existsSync(backupDirectory)
        ? fs.readdirSync(backupDirectory).filter((file) => file.endsWith('.db'))
        : [];
      const key = safeStorage.decryptString(fs.readFileSync(path.join(userData, 'db-key.enc')));
      const databaseKey = Buffer.from(key, 'base64');
      const db = new Database(dbFile, { readonly: true, fileMustExist: true });
      db.pragma("cipher='sqlcipher'");
      db.key(databaseKey);
      const appliedMigrations = db.prepare('SELECT COUNT(*) AS count FROM __drizzle_migrations').get().count as number;
      const secrets = (
        db.prepare('SELECT secret_enc FROM site_account WHERE deleted_at IS NULL').all() as { secret_enc: Buffer }[]
      ).map(({ secret_enc }) => safeStorage.decryptString(secret_enc));
      db.close();
      const migrationFolder = path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'drizzle');
      const migrationCount = fs.readdirSync(migrationFolder).filter((file) => file.endsWith('.sql')).length;
      const dbStats = fs.statSync(dbFile);
      const backup = backups.length ? path.join(backupDirectory, backups.sort().at(-1)!) : null;
      let backupOpensWithKey = false;
      let backupRefusesWithoutKey = false;
      let backupEncrypted = false;
      if (backup) {
        backupEncrypted = !fs.readFileSync(backup).subarray(0, 16).equals(Buffer.from('SQLite format 3\0'));
        const withKey = new Database(backup, { readonly: true, fileMustExist: true });
        withKey.pragma("cipher='sqlcipher'");
        withKey.key(databaseKey);
        withKey.prepare('SELECT COUNT(*) FROM sqlite_schema').get();
        withKey.close();
        const withoutKey = new Database(backup, { readonly: true, fileMustExist: true });
        try {
          withoutKey.prepare('SELECT COUNT(*) FROM sqlite_schema').get();
        } catch {
          backupRefusesWithoutKey = true;
        } finally {
          withoutKey.close();
        }
        backupOpensWithKey = true;
      }
      const logs = readFiles(path.join(userData, 'logs')).filter((file) => file.endsWith('.log'));
      const logText = logs.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
      const fatalLogEntries = logText
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            const entry = JSON.parse(line) as { level?: number };
            return typeof entry.level === 'number' && entry.level >= 50 ? [line] : [];
          } catch {
            return [];
          }
        });
      return {
        encrypted: !fs.readFileSync(dbFile).subarray(0, 16).equals(Buffer.from('SQLite format 3\0')),
        mode: dbStats.mode & 0o777,
        appliedMigrations,
        migrationCount,
        backupEncrypted,
        backupOpensWithKey,
        backupRefusesWithoutKey,
        fatalLogEntries,
        secretsRedacted: [databaseKey.toString('base64'), ...secrets].every((secret) => !logText.includes(secret)),
      };
    });

    expect(state.encrypted).toBe(true);
    expect(state.mode).toBe(0o600);
    expect(state.appliedMigrations).toBe(state.migrationCount);
    expect(state.backupEncrypted).toBe(true);
    expect(state.backupOpensWithKey).toBe(true);
    expect(state.backupRefusesWithoutKey).toBe(true);
    expect(state.fatalLogEntries).toEqual([]);
    expect(state.secretsRedacted).toBe(true);
    expect(rendererErrors).toEqual([]);
    const appStderr = mainStderr
      .join('')
      .split('\n')
      .filter((line) => !/XPC error for connection/.test(line));
    expect(appStderr.join('\n')).not.toMatch(/error/i);
  } finally {
    if (app) {
      const closeTimer = setTimeout(() => app?.process().kill('SIGKILL'), 5_000);
      try {
        await app.close();
      } finally {
        clearTimeout(closeTimer);
      }
    }
    if (testInfo.status === testInfo.expectedStatus) rmSync(userData, { recursive: true, force: true });
    else cpSync(userData, testInfo.outputPath('userData'), { recursive: true });
  }
});
