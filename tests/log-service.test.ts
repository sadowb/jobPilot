import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

const userData = vi.hoisted(() => `${process.env.TMPDIR ?? '/tmp'}/jobpilot-log-test-${process.pid}`);
vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.0.0', isPackaged: false },
  BrowserWindow: {},
  crashReporter: {},
  dialog: {},
  shell: {},
}));

import { initLogService, loggerFor, rotateLog, ARCHIVE_COUNT } from '../src/main/modules/observability/log.service';

const mainLog = join(userData, 'logs', 'main.log');
const lines = () =>
  readFileSync(mainLog, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

afterAll(() => rmSync(userData, { recursive: true, force: true }));

describe('LogService (#165)', () => {
  initLogService();

  it('writes JSON lines synchronously with module and correlation fields', () => {
    loggerFor('runs').fatal({ run_id: 'run-1', agent: 'claude' }, 'Run died');
    // No flush: the line must already be on disk.
    expect(lines().at(-1)).toMatchObject({
      level: 60,
      module: 'runs',
      run_id: 'run-1',
      agent: 'claude',
      msg: 'Run died',
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
    for (const secret of [apiKey, email, 'abc123']) expect(text).not.toContain(secret);
    expect(lines().at(-1)).toMatchObject({ msg: 'Redaction fixture' });
  });

  it('rotates past the size limit keeping five archives and deleting the oldest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'jobpilot-rotate-'));
    const path = join(directory, 'main.log');
    writeFileSync(path, 'small');
    expect(rotateLog(path, 100)).toBe(false);
    for (let generation = 1; generation <= 7; generation++) {
      writeFileSync(path, `generation ${generation} `.padEnd(200, '.'));
      expect(rotateLog(path, 100)).toBe(true);
    }
    expect(readdirSync(directory).sort()).toEqual(
      Array.from({ length: ARCHIVE_COUNT }, (_, index) => `main.${index + 1}.log`),
    );
    expect(readFileSync(join(directory, 'main.1.log'), 'utf8')).toMatch(/^generation 7/);
    expect(readFileSync(join(directory, 'main.5.log'), 'utf8')).toMatch(/^generation 3/);
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('diagnostics export (#165)', () => {
  it('scrubs run traces in the zip and drops unparseable lines', async () => {
    const { mkdirSync } = await import('node:fs');
    const { unzipSync, strFromU8 } = await import('fflate');
    const { buildDiagnostics } = await import('../src/main/modules/observability/diagnostics.service');
    mkdirSync(join(userData, 'logs', 'runs'), { recursive: true });
    const secret = { email: 'sara.benali@example.com', key: 'sk-ant-FAKEFAKEFAKEFAKEFAKE', phone: '+212 600 000 000' };
    writeFileSync(
      join(userData, 'logs', 'runs', 'run-1.jsonl'),
      [
        JSON.stringify({
          type: 'message',
          at: 1730000000000,
          payload: { text: `Mail ${secret.email} ${secret.key} call ${secret.phone}` },
        }),
        'not json',
      ].join('\n'),
    );
    const zip = unzipSync(buildDiagnostics());
    const trace = strFromU8(zip['logs/runs/run-1.jsonl']!);
    for (const value of Object.values(secret)) expect(trace).not.toContain(value);
    expect(JSON.parse(trace.trim())).toMatchObject({ at: 1730000000000 });
    expect(JSON.parse(strFromU8(zip['info.json']!))).toMatchObject({ dropped_run_trace_lines: 1 });
  });
});
