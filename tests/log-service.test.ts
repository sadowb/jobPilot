import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

const userData = mkdtempSync(join(tmpdir(), 'jobpilot-log-test-'));
const quit = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  app: {
    getPath: () => userData,
    isPackaged: true,
    quit,
    name: 'JobPilot',
    getVersion: () => '0.0.0',
    isReady: () => true,
    on: () => undefined,
    off: () => undefined,
    once: () => undefined,
  },
  ipcMain: {
    removeAllListeners: () => undefined,
    removeHandler: () => undefined,
    on: () => undefined,
    handle: () => undefined,
  },
  webContents: { getAllWebContents: () => [] },
}));

import log from 'electron-log/main';
import { archiveLog, initLogService, loggerFor } from '../src/main/modules/observability/log.service';

const mainLog = join(userData, 'logs', 'main.log');
const lines = () =>
  readFileSync(mainLog, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

afterAll(() => {
  log.errorHandler.stopCatching();
  rmSync(userData, { recursive: true, force: true });
});

describe('LogService (#165)', () => {
  initLogService();

  it('writes one JSON object per line with module and correlation fields', () => {
    loggerFor('runs').info({ run_id: 'run-1', agent: 'claude' }, 'Run started');
    expect(lines().at(-1)).toMatchObject({
      level: 'info',
      module: 'runs',
      run_id: 'run-1',
      agent: 'claude',
      msg: 'Run started',
    });
  });

  it('never writes secrets or emails to disk', () => {
    const apiKey = 'sk-ant-FAKEFAKEFAKEFAKEFAKE';
    const email = 'sara.benali@example.com';
    loggerFor('settings').error(
      {
        apiKey,
        contact: email,
        note: `reach ${email} with key ${apiKey} and token=abc123`,
        err: new Error(`bad ${email}`),
      },
      'Redaction fixture',
    );
    const text = readFileSync(mainLog, 'utf8');
    expect(text).not.toContain(apiKey);
    expect(text).not.toContain(email);
    expect(text).not.toContain('abc123');
    expect(lines().at(-1)).toMatchObject({ msg: 'Redaction fixture', level: 'error' });
  });

  it('has the fatal line on disk before quitting on an uncaught exception', () => {
    let onDiskAtQuit = false;
    quit.mockImplementationOnce(() => {
      onDiskAtQuit = lines().some((line) => line.level === 'fatal' && line.msg === 'Uncaught main-process exception');
    });
    (log.errorHandler as unknown as { handleError(error: Error): void }).handleError(new Error('boom'));
    expect(quit).toHaveBeenCalledTimes(1);
    expect(onDiskAtQuit).toBe(true);
  });

  it('keeps the last five archives and deletes the oldest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'jobpilot-rotate-'));
    const path = join(directory, 'main.log');
    for (let generation = 1; generation <= 7; generation++) {
      writeFileSync(path, `generation ${generation}`);
      archiveLog({ toString: () => path });
    }
    expect(readdirSync(directory).sort()).toEqual([
      'main.1.log',
      'main.2.log',
      'main.3.log',
      'main.4.log',
      'main.5.log',
    ]);
    expect(readFileSync(join(directory, 'main.1.log'), 'utf8')).toBe('generation 7');
    expect(readFileSync(join(directory, 'main.5.log'), 'utf8')).toBe('generation 3');
    rmSync(directory, { recursive: true, force: true });
  });
});
