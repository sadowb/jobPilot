import { _electron as electron, expect, test } from '@playwright/test';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint-disable-next-line no-empty-pattern
test('upgrades the same user profile from the base app', async ({}, testInfo) => {
  const baseExecutable = process.env.JOBPILOT_BASE_EXECUTABLE;
  test.skip(!baseExecutable, 'Base packaged app was not built; CI supplies it for upgrade coverage.');
  test.setTimeout(150_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-upgrade-'));
  let oldApp: Awaited<ReturnType<typeof electron.launch>> | undefined;
  let newApp: Awaited<ReturnType<typeof electron.launch>> | undefined;
  try {
    oldApp = await electron.launch({
      executablePath: baseExecutable!,
      args: [`--user-data-dir=${userData}`],
      timeout: 60_000,
    });
    const oldWindow = await oldApp.firstWindow({ timeout: 60_000 });
    await expect(oldWindow.getByRole('navigation', { name: 'Main' })).toBeVisible({ timeout: 30_000 });
    const toggle = oldWindow.getByRole('button', { name: /Switch to (dark|light) mode/ });
    const expectedDark = !(await oldWindow.evaluate(() => document.documentElement.classList.contains('dark')));
    await toggle.click();
    await expect
      .poll(() => oldWindow.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(expectedDark);
    const oldCloseTimer = setTimeout(() => oldApp?.process().kill('SIGKILL'), 5_000);
    try {
      await oldApp.close();
    } finally {
      clearTimeout(oldCloseTimer);
    }
    oldApp = undefined;

    // Base builds from before the encrypted DB existed have nothing to upgrade; check before asserting on backups.
    const dbFile = join(userData, 'jobpilot.db');
    if (!existsSync(dbFile)) {
      testInfo.annotations.push({ type: 'upgrade-skip', description: 'Base app did not create a database.' });
      test.skip(true, 'Base app has no database to upgrade.');
    }
    const backupDirectory = join(userData, 'backups');
    const preMigrationBackups = existsSync(backupDirectory)
      ? readdirSync(backupDirectory).filter((file) => file.endsWith('.db'))
      : [];
    expect(preMigrationBackups.length).toBeGreaterThan(0);
    const dbBytesBefore = readFileSync(dbFile);
    newApp = await electron.launch({
      executablePath:
        process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot',
      args: [`--user-data-dir=${userData}`],
      timeout: 60_000,
    });
    const newWindow = await newApp.firstWindow({ timeout: 60_000 });
    await expect(newWindow.getByRole('navigation', { name: 'Main' })).toBeVisible({ timeout: 30_000 });
    expect(await newWindow.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(expectedDark);
    const upgrade = await newApp.evaluate(({ app }, priorBackups) => {
      const fs = process.getBuiltinModule('node:fs')!;
      const path = process.getBuiltinModule('node:path')!;
      const createRequire = process.getBuiltinModule('node:module')!.createRequire;
      const nodeRequire = createRequire(path.join(app.getAppPath(), 'package.json'));
      const Database = nodeRequire('better-sqlite3') as typeof import('better-sqlite3');
      const { safeStorage } = nodeRequire('electron') as typeof import('electron');
      const userData = app.getPath('userData');
      const key = Buffer.from(safeStorage.decryptString(fs.readFileSync(path.join(userData, 'db-key.enc'))), 'base64');
      const dbFile = path.join(userData, 'jobpilot.db');
      const db = new Database(dbFile, { readonly: true, fileMustExist: true });
      db.pragma("cipher='sqlcipher'");
      db.key(key);
      const applied = db.prepare('SELECT COUNT(*) AS count FROM __drizzle_migrations').get().count as number;
      db.close();
      const migrationFolder = path.join(process.resourcesPath, 'drizzle');
      const expected = fs.readdirSync(migrationFolder).filter((file: string) => file.endsWith('.sql')).length;
      const backupFolder = path.join(userData, 'backups');
      const backups = fs.existsSync(backupFolder)
        ? fs.readdirSync(backupFolder).filter((file: string) => file.endsWith('.db'))
        : [];
      let backupWorks = false;
      if (priorBackups.length) {
        const backup = path.join(backupFolder, priorBackups.sort().at(-1)!);
        const backupDb = new Database(backup, { readonly: true, fileMustExist: true });
        backupDb.pragma("cipher='sqlcipher'");
        backupDb.key(key);
        backupWorks = backupDb.prepare('SELECT COUNT(*) FROM sqlite_schema').get() !== undefined;
        backupDb.close();
      }
      return { applied, expected, backups: backups.length, backupWorks };
    }, preMigrationBackups);
    expect(upgrade.applied).toBe(upgrade.expected);
    expect(upgrade.backups).toBeGreaterThan(0);
    expect(upgrade.backupWorks).toBe(true);
    expect(statSync(dbFile).size).toBeGreaterThan(0);
    expect(dbBytesBefore.subarray(0, 16).equals(Buffer.from('SQLite format 3\0'))).toBe(false);
  } finally {
    for (const instance of [oldApp, newApp]) {
      if (!instance) continue;
      const closeTimer = setTimeout(() => instance.process().kill('SIGKILL'), 5_000);
      try {
        await instance.close();
      } finally {
        clearTimeout(closeTimer);
      }
    }
    if (testInfo.status === testInfo.expectedStatus) rmSync(userData, { recursive: true, force: true });
    else {
      testInfo.annotations.push({ type: 'userData', description: userData });
      cpSync(userData, testInfo.outputPath('userData'), { recursive: true });
    }
  }
});
