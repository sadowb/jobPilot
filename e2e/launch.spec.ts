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
      ];
      const values = names.map((name) => `redaction-fixture-${name}-private`);
      const payload = {
        a: {
          b: {
            c: Object.fromEntries(names.map((name, index) => [name, values[index]])),
            list: [{ password: values[0] }],
            visible: 'kept',
          },
        },
      };
      const before = JSON.stringify(payload);
      const logger = loggerFor('redaction-e2e');
      logger.info(payload, 'Nested redaction fixture');
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
        allRedacted: values.every((value) => !row.payload.includes(value) && !trace.includes(value)),
        markers: Object.values(tracePayload.a.b.c).every((value) => value === '[REDACTED]'),
        kept: tracePayload.a.b.visible === 'kept',
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
      const { dialog } = nodeRequire('electron') as typeof import('electron');
      const original = dialog.showMessageBox;
      const dialogs: Electron.MessageBoxOptions[] = [];
      const responses = [0, 1, 0];
      dialog.showMessageBox = (async (...args: unknown[]) => {
        dialogs.push(args.at(-1) as Electron.MessageBoxOptions);
        return { response: responses.shift() ?? 0, checkboxChecked: false };
      }) as typeof dialog.showMessageBox;
      Object.assign(globalThis, {
        recoveryDialogCheck: () => {
          if (dialogs.length === 3) dialog.showMessageBox = original;
          return dialogs;
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
        app!.evaluate(() => {
          const check = (globalThis as typeof globalThis & { recoveryDialogCheck: () => Electron.MessageBoxOptions[] })
            .recoveryDialogCheck;
          // Only restore after the async safeStorage read and final dialog have completed.
          const dialogs = check();
          const key = dialogs[2]?.detail;
          return (
            dialogs.length === 3 &&
            typeof key === 'string' &&
            /^[A-Za-z0-9+/]{43}=$/.test(key) &&
            Buffer.from(key, 'base64').length === 32 &&
            dialogs[2]?.message?.includes('main Bitwarden vault')
          );
        }),
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
            const entry = JSON.parse(line) as { level?: number };
            return typeof entry.level === 'number' && entry.level >= 50 ? [line] : [];
          } catch {
            return [];
          }
        });
      return {
        nestedLoggerRedacted:
          !logText.includes('-private') &&
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
