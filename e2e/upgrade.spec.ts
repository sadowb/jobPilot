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
  const migrationFixture = async (instance: NonNullable<typeof newApp>, action: 'reset' | 'fail' | 'retry') =>
    instance.evaluate(async ({ app }, action) => {
      const fs = process.getBuiltinModule('node:fs')!;
      const path = process.getBuiltinModule('node:path')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { safeStorage } = nodeRequire('electron') as typeof import('electron');
      const Database = nodeRequire('better-sqlite3') as typeof import('better-sqlite3');
      const key = Buffer.from(
        (await safeStorage.decryptStringAsync(fs.readFileSync(path.join(app.getPath('userData'), 'db-key.enc'))))
          .result,
        'base64',
      );
      const db = new Database(path.join(app.getPath('userData'), 'jobpilot.db'));
      try {
        db.pragma("cipher='sqlcipher'");
        db.key(key);
        if (action === 'reset') {
          // The current base may already have migrated; seed the pre-migration state explicitly.
          db.transaction(() => {
            db.prepare("DELETE FROM settings WHERE key = 'profile.localStorageMigration.v1'").run();
            db.prepare('DELETE FROM profile').run();
          })();
        } else if (action === 'fail')
          db.exec(
            "CREATE TRIGGER fail_profile_migration BEFORE INSERT ON settings WHEN NEW.key = 'profile.localStorageMigration.v1' BEGIN SELECT RAISE(ABORT, 'migration fixture'); END",
          );
        else db.exec('DROP TRIGGER fail_profile_migration');
        return {
          profiles: db.prepare('SELECT count(*) AS count FROM profile').get().count as number,
          markers: db
            .prepare("SELECT count(*) AS count FROM settings WHERE key = 'profile.localStorageMigration.v1'")
            .get().count as number,
        };
      } finally {
        key.fill(0);
        db.close();
      }
    }, action);
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
    await oldWindow.evaluate(() => {
      localStorage.setItem('jobpilot.profile.v1', '{broken');
      localStorage.setItem(
        'jobpilot.answers.v1',
        JSON.stringify([
          { id: 'start', question: 'When can you start?', answer: '2 weeks' },
          { id: 'relocate', question: 'Are you willing to relocate?', answer: 'Yes, for the right role' },
        ]),
      );
      localStorage.setItem('jobpilot.markets.v1', JSON.stringify([{ code: 'FR', workAuth: 'sponsorship' }]));
    });
    await migrationFixture(oldApp, 'reset');
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
    await expect(newWindow.getByRole('alert')).toContainText('Could not load your profile');
    expect(await newWindow.evaluate(() => localStorage.getItem('jobpilot.profile.v1'))).toBe('{broken');
    expect(await newWindow.evaluate(() => localStorage.getItem('jobpilot.answers.v1'))).not.toBeNull();
    await newWindow.evaluate(() =>
      localStorage.setItem(
        'jobpilot.profile.v1',
        JSON.stringify({
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          linkedin: 'https://linkedin.com/in/ada',
        }),
      ),
    );
    await migrationFixture(newApp, 'fail');
    await newWindow.getByRole('button', { name: 'Retry' }).click();
    await expect(newWindow.getByRole('alert')).toContainText('Could not load your profile');
    expect(await newWindow.evaluate(() => localStorage.getItem('jobpilot.profile.v1'))).toContain('Ada');
    expect(await newWindow.evaluate(() => localStorage.getItem('jobpilot.answers.v1'))).not.toBeNull();
    expect(await migrationFixture(newApp, 'retry')).toEqual({ profiles: 0, markers: 0 });
    await newWindow.getByRole('button', { name: 'Retry' }).click();
    await expect(newWindow.getByRole('navigation', { name: 'Main' })).toBeVisible({ timeout: 30_000 });
    const migrated = await newWindow.evaluate(() => window.jobpilot!.profile.get());
    expect(migrated.personal?.firstName).toBe('Ada');
    expect(migrated.personal?.notice).toEqual({ kind: 'period', days: 14 });
    expect(migrated.answers).toContainEqual({
      id: 'relocate',
      question: 'Are you willing to relocate?',
      default: 'Yes, for the right role',
      overrides: {},
    });
    expect(migrated.markets).toEqual([{ code: 'FR', workAuth: 'sponsorship' }]);
    expect(
      await newWindow.evaluate(() =>
        ['jobpilot.profile.v1', 'jobpilot.answers.v1', 'jobpilot.answers.v2', 'jobpilot.markets.v1'].map((key) =>
          localStorage.getItem(key),
        ),
      ),
    ).toEqual([null, null, null, null]);
    // A stale browser value cannot overwrite a completed migration.
    await newWindow.evaluate(() => localStorage.setItem('jobpilot.profile.v1', '{stale and broken'));
    await newWindow.reload();
    await expect(newWindow.getByRole('navigation', { name: 'Main' })).toBeVisible();
    expect((await newWindow.evaluate(() => window.jobpilot!.profile.get())).personal?.firstName).toBe('Ada');

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
