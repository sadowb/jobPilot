import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

type Entry = { level?: number; module?: string; msg?: string; reason?: string; time?: number };

// eslint-disable-next-line no-empty-pattern
test('writes JSON logs under userData and records crashes and unclean shutdowns (#165)', async ({}, testInfo) => {
  test.setTimeout(180_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-diagnostics-'));
  const packaged = testInfo.project.name === 'packaged';
  const executablePath =
    process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot';
  const launch = () =>
    electron.launch({
      ...(packaged ? { executablePath } : {}),
      args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
      timeout: 60_000,
    });
  const logFile = join(userData, 'logs', 'main.log');
  const entries = (): Entry[] =>
    existsSync(logFile)
      ? readFileSync(logFile, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line) as Entry)
      : [];
  // Common logger default; ADR 0016 forbids writing there.
  const external = join(homedir(), 'Library', 'Logs', 'JobPilot');
  const externalBefore = existsSync(external) ? statSync(external).mtimeMs : undefined;
  let app: ElectronApplication | undefined;
  try {
    app = await launch();
    await app.firstWindow({ timeout: 15_000 });
    await expect.poll(() => entries().some((entry) => entry.msg === 'Session started')).toBe(true);
    expect(entries().every((entry) => typeof entry.time === 'number' && typeof entry.level === 'number')).toBe(true);
    expect(existsSync(join(userData, 'crashes'))).toBe(true);
    expect(existsSync(join(userData, 'logs', 'session.lock'))).toBe(true);

    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.forcefullyCrashRenderer();
    });
    await expect
      .poll(() => entries().find((entry) => entry.msg === 'Renderer process gone'))
      .toMatchObject({ level: 50, module: 'electron' });
    expect(entries().find((entry) => entry.msg === 'Renderer process gone')?.reason).toBeTruthy();

    app.process().kill('SIGKILL');
    await app.waitForEvent('close').catch(() => undefined);
    expect(existsSync(join(userData, 'logs', 'session.lock'))).toBe(true);
    app = await launch();
    await app.firstWindow({ timeout: 15_000 });
    await expect
      .poll(() => entries().find((entry) => entry.msg === 'Previous session ended unexpectedly'))
      .toMatchObject({ level: 40 });

    await app.close();
    app = undefined;
    expect(existsSync(join(userData, 'logs', 'session.lock'))).toBe(false);
    if (process.platform === 'darwin') {
      expect(existsSync(external) ? statSync(external).mtimeMs : undefined).toBe(externalBefore);
    }
  } finally {
    await app?.close().catch(() => undefined);
    rmSync(userData, { recursive: true, force: true });
  }
});
