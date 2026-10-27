import { skipOnboarding } from './onboarding';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { cpSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint-disable-next-line no-empty-pattern
test('launches JobPilot and verifies encrypted storage, migrations, backups, and clean logs', async ({}, testInfo) => {
  test.setTimeout(180_000);
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
      await skipOnboarding(window);
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

    const redaction = await app.evaluate(async ({ app }) => {
      const fs = process.getBuiltinModule('node:fs')!;
      const path = process.getBuiltinModule('node:path')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { safeStorage } = nodeRequire('electron') as typeof import('electron');
      const Database = nodeRequire('better-sqlite3') as typeof import('better-sqlite3');
      const { loggerFor, RunTraceService } = nodeRequire(
        path.join(app.getAppPath(), 'out/main/index.js'),
      ) as typeof import('../src/main/app/main');
      const key = Buffer.from(
        (await safeStorage.decryptStringAsync(fs.readFileSync(path.join(app.getPath('userData'), 'db-key.enc'))))
          .result,
        'base64',
      );
      const db = new Database(path.join(app.getPath('userData'), 'jobpilot.db'));
      db.pragma("cipher='sqlcipher'");
      db.key(key);
      db.pragma('foreign_keys = ON');
      const id = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
      const now = Date.now();
      db.prepare('INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        id,
        'Redaction fixture',
        'redaction-fixture',
        now,
        now,
      );
      db.prepare(
        'INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, id, 'https://example.com/redaction', 'https://example.com/redaction', 'custom', 'Fixture', now, now);
      db.prepare(
        'INSERT INTO application (id, posting_id, queue_rank, last_activity_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, id, 1, now, now, now);
      db.prepare(
        'INSERT INTO run (id, application_id, agent, browser, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, id, 'claude', 'neo', now, now);
      const names = [
        'password',
        'passwd',
        'passphrase',
        'access_token',
        'refresh_token',
        'private_key',
        'session_id',
        'secret',
        'token',
        'cookie',
        'authorization',
        'key',
        'hexkey',
        'apiKey',
        'api_key',
        'session',
        'BW_SESSION',
        'otp',
        'totp',
        'code',
        'dbPassword',
        'clientSecret',
        'x-api-key',
        'set-cookie',
        'sessionToken',
        'githubToken',
        'signingPrivateKey',
        'databaseHexKey',
      ];
      const values = names.map((name) => `redaction-fixture-${name}-private`);
      const metadata = {
        canonical_key: 'work_authorization',
        field_key: 'q_123',
        sqliteCode: 'SQLITE_NOTADB',
        keyboard: 'QWERTY',
        zip_code: '12345',
        status_code: 'failed',
        sqlite_status: 'busy',
        error_class: 'DatabaseError',
      };
      const payload = {
        ...metadata,
        a: {
          b: {
            c: Object.fromEntries(names.map((name, index) => [name, values[index]])),
            list: [{ password: values[0] }],
            visible: 'kept',
            diagnostic:
              'file:jobpilot.db?cipher=sqlcipher&hexkey=deadbeef key=key-private password=password-private token=token-private Bearer bearer-private',
          },
        },
      };
      const before = JSON.stringify(payload);
      const logger = loggerFor('redaction-e2e');
      logger.info(payload, 'Nested redaction fixture');
      logger.error(
        {
          ...payload,
          err: Object.assign(new Error('open failed file:jobpilot.db?cipher=sqlcipher&hexkey=deadbeef'), {
            code: 'SQLITE_NOTADB',
            password: values[0],
            extra: payload,
          }),
        },
        'Error redaction fixture',
      );
      const cycle: Record<string, unknown> = { password: values[0] };
      cycle.self = cycle;
      logger.info({ cycle }, 'Cycle redaction fixture');
      let deep: Record<string, unknown> = { password: values[0] };
      for (let index = 0; index < 25; index++) deep = { child: deep };
      logger.info({ deep }, 'Depth redaction fixture');
      RunTraceService.append({ runId: id, type: 'message', payload });
      const row = db.prepare('SELECT payload FROM run_event WHERE run_id = ?').get(id) as { payload: string };
      const trace = fs.readFileSync(path.join(app.getPath('userData'), 'logs', 'runs', `${id}.jsonl`), 'utf8');
      db.close();
      await new Promise<void>((resolve, reject) => logger.flush((error) => (error ? reject(error) : resolve())));
      const tracePayload = JSON.parse(row.payload);
      return {
        unmodified: JSON.stringify(payload) === before,
        allRedacted:
          values.every((value) => !row.payload.includes(value) && !trace.includes(value)) &&
          !row.payload.includes('deadbeef') &&
          !trace.includes('deadbeef') &&
          !row.payload.includes('-private') &&
          !trace.includes('-private'),
        markers: Object.values(tracePayload.a.b.c).every((value) => value === '[REDACTED]'),
        kept:
          tracePayload.a.b.visible === 'kept' &&
          tracePayload.a.b.diagnostic ===
            'file:jobpilot.db?cipher=sqlcipher&hexkey=[REDACTED] key=[REDACTED] password=[REDACTED] token=[REDACTED] Bearer [REDACTED]' &&
          Object.entries(metadata).every(([key, value]) => tracePayload[key] === value),
        traceMatches: JSON.stringify(JSON.parse(trace).payload) === row.payload,
      };
    });
    expect(redaction).toEqual({ unmodified: true, allRedacted: true, markers: true, kept: true, traceMatches: true });

    // Native dialogs are intercepted in main: the exported key never crosses into the renderer or test trace.
    await app.evaluate(({ app }) => {
      const path = process.getBuiltinModule('node:path')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { dialog, clipboard } = nodeRequire('electron') as typeof import('electron');
      const original = dialog.showMessageBox;
      const dialogs: Electron.MessageBoxOptions[] = [];
      const responses = [0, 1, 1];
      dialog.showMessageBox = (async (...args: unknown[]) => {
        dialogs.push(args.at(-1) as Electron.MessageBoxOptions);
        return { response: responses.shift() ?? 0, checkboxChecked: false };
      }) as typeof dialog.showMessageBox;
      Object.assign(globalThis, {
        recoveryDialogCheck: async () => {
          const key = dialogs[2]?.detail;
          const complete =
            dialogs.length === 3 &&
            typeof key === 'string' &&
            /^[A-Za-z0-9+/]{43}=$/.test(key) &&
            Buffer.from(key, 'base64').length === 32 &&
            dialogs[2]?.message?.includes('main Bitwarden vault') &&
            (await clipboard.readText()) === key;
          if (complete) dialog.showMessageBox = original;
          return Boolean(complete);
        },
      });
    });
    await window.evaluate(() => {
      location.hash = '#/settings';
    });
    const exportButton = window.getByRole('button', { name: 'Export recovery key' });
    await window.evaluate(() => window.jobpilot.recovery.export());
    await exportButton.click();
    await expect
      .poll(() =>
        app!.evaluate(() =>
          (globalThis as typeof globalThis & { recoveryDialogCheck: () => Promise<boolean> }).recoveryDialogCheck(),
        ),
      )
      .toBe(true);
    await window.evaluate(() => {
      location.hash = '#/';
    });

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
      const logs = readFiles(path.join(userData, 'logs')).filter(
        (file) => file.endsWith('.log') || file.endsWith('.jsonl'),
      );
      const logText = logs.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
      const fatalLogEntries = logText
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            const entry = JSON.parse(line) as { level?: number; msg?: string };
            if (entry.msg === 'Error redaction fixture') return [];
            return typeof entry.level === 'number' && entry.level >= 50 ? [line] : [];
          } catch {
            return [];
          }
        });
      const errorEntry = logText
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .find((entry) => entry.msg === 'Error redaction fixture');
      return {
        errorPreserved: {
          type: errorEntry?.err.type,
          message: errorEntry?.err.message,
          stack:
            errorEntry?.err.stack?.startsWith(
              'Error: open failed file:jobpilot.db?cipher=sqlcipher&hexkey=[REDACTED]\n',
            ) && /\n\s+at /.test(errorEntry.err.stack),
          code: errorEntry?.err.code,
          password: errorEntry?.err.password,
          extraPassword: errorEntry?.err.extra?.a.b.c.password,
          canonical_key: errorEntry?.canonical_key,
          field_key: errorEntry?.field_key,
          sqliteCode: errorEntry?.sqliteCode,
          nestedPassword: errorEntry?.a.b.c.password,
        },
        nestedLoggerRedacted:
          !logText.includes('-private') &&
          !logText.includes('deadbeef') &&
          logText.includes('Nested redaction fixture') &&
          logText.includes('[Circular]') &&
          logText.includes('[Depth limit]'),
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

    expect(state.errorPreserved).toEqual({
      type: 'Error',
      message: 'open failed file:jobpilot.db?cipher=sqlcipher&hexkey=[REDACTED]',
      stack: true,
      code: 'SQLITE_NOTADB',
      password: '[REDACTED]',
      extraPassword: '[REDACTED]',
      canonical_key: 'work_authorization',
      field_key: 'q_123',
      sqliteCode: 'SQLITE_NOTADB',
      nestedPassword: '[REDACTED]',
    });
    expect(state.nestedLoggerRedacted).toBe(true);
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

    const keyFile = join(userData, 'db-key.enc');
    const fixtureKey = join(userData, 'fixture-key.enc');
    cpSync(keyFile, fixtureKey);
    for (const failure of ['missing', 'unreadable', 'wrong-key']) {
      if (failure === 'wrong-key') {
        await app.evaluate(async ({ app }) => {
          const fs = process.getBuiltinModule('node:fs')!;
          const path = process.getBuiltinModule('node:path')!;
          const nodeRequire = process
            .getBuiltinModule('node:module')!
            .createRequire(path.join(app.getAppPath(), 'package.json'));
          const { safeStorage } = nodeRequire('electron') as typeof import('electron');
          fs.writeFileSync(
            path.join(app.getPath('userData'), 'db-key.enc'),
            await safeStorage.encryptStringAsync(Buffer.alloc(32).toString('base64')),
          );
        });
      }
      await app.close();
      app = undefined;
      if (failure === 'missing') rmSync(keyFile);
      if (failure === 'unreadable') writeFileSync(keyFile, 'invalid encrypted fixture', { mode: 0o600 });
      const beforeRecovery = readFileSync(join(userData, 'jobpilot.db'));
      app = await electron.launch({
        ...(packaged ? { executablePath } : {}),
        args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
        timeout: 60_000,
      });
      const recoveryWindow = await app.firstWindow();
      await expect(recoveryWindow.getByRole('dialog', { name: 'Recover database' })).toBeVisible();
      await recoveryWindow.getByLabel('Recovery key', { exact: true }).fill(Buffer.alloc(32).toString('base64'));
      await recoveryWindow.getByRole('button', { name: 'Unlock database' }).click();
      await expect(recoveryWindow.getByRole('alert')).toContainText('could not unlock');
      expect(readFileSync(join(userData, 'jobpilot.db')).equals(beforeRecovery)).toBe(true);
      if (failure === 'missing') expect(existsSync(keyFile)).toBe(false);
      await app.evaluate(async ({ app }) => {
        const fs = process.getBuiltinModule('node:fs')!;
        const path = process.getBuiltinModule('node:path')!;
        const nodeRequire = process
          .getBuiltinModule('node:module')!
          .createRequire(path.join(app.getAppPath(), 'package.json'));
        const { safeStorage, BrowserWindow } = nodeRequire('electron') as typeof import('electron');
        const { result } = await safeStorage.decryptStringAsync(
          fs.readFileSync(path.join(app.getPath('userData'), 'fixture-key.enc')),
        );
        const window = BrowserWindow.getAllWindows()[0]!;
        await window.webContents.executeJavaScript(
          `document.getElementById('recovery-key').value = ${JSON.stringify(result)}; undefined`,
        );
      });
      const restoredWindowPromise = app.waitForEvent('window');
      await recoveryWindow.getByRole('button', { name: 'Unlock database' }).click();
      window = await restoredWindowPromise;
      await skipOnboarding(window);
      await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
      expect(
        await window.evaluate(() => window.jobpilot.recovery.import('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')),
      ).toBe(false);
      const recovered = await app.evaluate(async ({ app }) => {
        const fs = process.getBuiltinModule('node:fs')!;
        const path = process.getBuiltinModule('node:path')!;
        const nodeRequire = process
          .getBuiltinModule('node:module')!
          .createRequire(path.join(app.getAppPath(), 'package.json'));
        const { safeStorage } = nodeRequire('electron') as typeof import('electron');
        const directory = app.getPath('userData');
        const { result: expected } = await safeStorage.decryptStringAsync(
          fs.readFileSync(path.join(directory, 'fixture-key.enc')),
        );
        const { result: actual } = await safeStorage.decryptStringAsync(
          fs.readFileSync(path.join(directory, 'db-key.enc')),
        );
        const readLogs = (directory: string): string =>
          fs
            .readdirSync(directory, { withFileTypes: true })
            .map((entry) => {
              const file = path.join(directory, entry.name);
              return entry.isDirectory() ? readLogs(file) : fs.readFileSync(file, 'utf8');
            })
            .join('');
        return { restored: actual === expected, private: !readLogs(path.join(directory, 'logs')).includes(expected) };
      });
      expect(recovered).toEqual({ restored: true, private: true });
    }
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

// eslint-disable-next-line no-empty-pattern
test('backs up a new UTC day without restarting and retries failed hourly checks', async ({}, testInfo) => {
  test.setTimeout(90_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-daily-backup-'));
  const packaged = testInfo.project.name === 'packaged';
  let app: ElectronApplication | undefined;
  try {
    app = await electron.launch({
      ...(packaged
        ? {
            executablePath:
              process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot',
          }
        : {}),
      args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
      timeout: 60_000,
    });
    await skipOnboarding(await app.firstWindow());
    await expect((await app.firstWindow()).getByRole('navigation', { name: 'Main' })).toBeVisible();
    const result = await app.evaluate(async ({ app }) => {
      const fs = process.getBuiltinModule('node:fs')!;
      const path = process.getBuiltinModule('node:path')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { databaseBackupTimer: timer } = nodeRequire(path.join(app.getAppPath(), 'out/main/index.js')) as {
        databaseBackupTimer: NodeJS.Timeout & { _idleTimeout: number; _onTimeout: () => Promise<void> };
      };
      const { safeStorage } = nodeRequire('electron') as typeof import('electron');
      const Database = nodeRequire('better-sqlite3') as typeof import('better-sqlite3');
      const directory = path.join(app.getPath('userData'), 'backups');
      const originalDate = Date;
      const decrypt = safeStorage.decryptStringAsync;
      let keyReads = 0;
      safeStorage.decryptStringAsync = (...args) => {
        keyReads++;
        return decrypt.call(safeStorage, ...args);
      };
      const today = new Date().toISOString().slice(0, 10);
      const original = path.join(directory, `jobpilot-${today}.db`);
      const before = fs.statSync(original).mtimeMs;
      try {
        await timer._onTimeout();
        const sameDaySkipped = keyReads === 0 && fs.statSync(original).mtimeMs === before;
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        // Only the inspector harness changes the clock; no test clock or IPC exists in shipped builds.
        globalThis.Date = class extends originalDate {
          constructor() {
            super(tomorrow.getTime());
          }
        } as DateConstructor;
        const target = path.join(directory, `jobpilot-${new Date().toISOString().slice(0, 10)}.db`);
        fs.renameSync(directory, `${directory}-fixture`);
        fs.writeFileSync(directory, 'backup failure fixture', { mode: 0o600 });
        try {
          await Promise.all([timer._onTimeout(), timer._onTimeout()]);
        } finally {
          fs.rmSync(directory);
          fs.renameSync(`${directory}-fixture`, directory);
        }
        const failedWithoutBackup = !fs.existsSync(target);
        const readsAfterFailure = keyReads;
        await Promise.all([timer._onTimeout(), timer._onTimeout()]);
        const retryReads = keyReads - readsAfterFailure;
        const { result: encoded } = await decrypt.call(
          safeStorage,
          fs.readFileSync(path.join(app.getPath('userData'), 'db-key.enc')),
        );
        const key = Buffer.from(encoded, 'base64');
        const backup = new Database(target, { readonly: true, fileMustExist: true });
        let opensWithKey = false;
        try {
          backup.pragma("cipher='sqlcipher'");
          backup.key(key);
          backup.prepare('SELECT count(*) FROM sqlite_schema').get();
          opensWithKey = true;
        } finally {
          backup.close();
          key.fill(0);
        }
        const withoutKey = new Database(target, { readonly: true, fileMustExist: true });
        let refusesWithoutKey = false;
        try {
          withoutKey.prepare('SELECT count(*) FROM sqlite_schema').get();
        } catch {
          refusesWithoutKey = true;
        } finally {
          withoutKey.close();
        }
        return {
          hourly: timer._idleTimeout === 3_600_000,
          unreferenced: !timer.hasRef(),
          sameDaySkipped,
          failedWithoutBackup,
          failureReads: readsAfterFailure,
          retryReads,
          opensWithKey,
          refusesWithoutKey,
          encrypted: !fs.readFileSync(target).subarray(0, 16).equals(Buffer.from('SQLite format 3\0')),
          mode: fs.statSync(target).mode & 0o777,
        };
      } finally {
        globalThis.Date = originalDate;
        safeStorage.decryptStringAsync = decrypt;
      }
    });
    expect(result).toEqual({
      hourly: true,
      unreferenced: true,
      sameDaySkipped: true,
      failedWithoutBackup: true,
      failureReads: 1,
      retryReads: 1,
      opensWithKey: true,
      refusesWithoutKey: true,
      encrypted: true,
      mode: 0o600,
    });
    await skipOnboarding(await app.firstWindow());
    await expect((await app.firstWindow()).getByRole('navigation', { name: 'Main' })).toBeVisible();
  } finally {
    if (app) await app.close();
    if (testInfo.status === testInfo.expectedStatus) rmSync(userData, { recursive: true, force: true });
    else cpSync(userData, testInfo.outputPath('userData'), { recursive: true });
  }
});

// eslint-disable-next-line no-empty-pattern
test('profile edits and common answers persist in the database after relaunch', async ({}, testInfo) => {
  test.setTimeout(150_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-profile-'));
  const packaged = testInfo.project.name === 'packaged';
  const launch = () =>
    electron.launch({
      ...(packaged
        ? {
            executablePath:
              process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot',
          }
        : {}),
      args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
      timeout: 60_000,
    });
  let instance: ElectronApplication | undefined;
  const close = async () => {
    if (!instance) return;
    const timer = setTimeout(() => instance?.process().kill('SIGKILL'), 5_000);
    try {
      await instance.close();
    } finally {
      clearTimeout(timer);
      instance = undefined;
    }
  };
  try {
    instance = await launch();
    let window = await instance.firstWindow({ timeout: 60_000 });
    await skipOnboarding(window);
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await window.evaluate(() => {
      location.hash = '#/profile';
    });
    await window.getByRole('button', { name: 'Edit identity' }).click();
    await window.getByLabel('First name', { exact: true }).fill('Ada');
    await window.getByLabel('Last name', { exact: true }).fill('Lovelace');
    await window.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(window.getByRole('dialog')).toHaveCount(0);
    await window.evaluate(async () => {
      const { personal } = await window.jobpilot!.profile.get();
      if (!personal) throw new Error('Saved profile is missing');
      await window.jobpilot!.profile.save({
        section: 'personal',
        value: { ...personal, salaryAmount: 5000, salaryPeriod: 'month', salaryCurrency: 'EUR' },
      });
      await window.jobpilot!.profile.save({
        section: 'answers',
        value: [
          {
            id: 'intro',
            question: 'Tell us about yourself.',
            default: 'I build useful software.',
            overrides: { FR: 'Je crée des logiciels.' },
          },
        ],
      });
      localStorage.clear();
    });
    await close();
    instance = await launch();
    window = await instance.firstWindow({ timeout: 60_000 });
    await skipOnboarding(window);
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await window.evaluate(() => {
      location.hash = '#/profile';
    });
    await window.getByRole('button', { name: 'Edit identity' }).click();
    await expect(window.getByLabel('First name', { exact: true })).toHaveValue('Ada');
    await expect(window.getByLabel('Last name', { exact: true })).toHaveValue('Lovelace');
    const stored = await window.evaluate(() => window.jobpilot!.profile.get());
    expect(stored.personal?.firstName).toBe('Ada');
    expect(stored.personal?.salaryAmount).toBe(5000);
    expect(stored.personal?.salaryPeriod).toBe('month');
    const salary = await instance.evaluate(async ({ app }) => {
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
      const db = new Database(path.join(app.getPath('userData'), 'jobpilot.db'), { readonly: true });
      try {
        db.pragma("cipher='sqlcipher'");
        db.key(key);
        return db.prepare('SELECT salary_min, salary_currency FROM profile').get();
      } finally {
        key.fill(0);
        db.close();
      }
    });
    expect(salary).toEqual({ salary_min: 60000, salary_currency: 'EUR' });
    expect(stored.answers?.[0]?.default).toBe('I build useful software.');
    expect(stored.answers?.[0]?.overrides.FR).toBe('Je crée des logiciels.');
  } finally {
    await close();
    if (testInfo.status === testInfo.expectedStatus) rmSync(userData, { recursive: true, force: true });
  }
});
