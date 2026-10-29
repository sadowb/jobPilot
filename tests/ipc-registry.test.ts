import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import Database from 'better-sqlite3';

const handlers = vi.hoisted(() => new Map<string, (event: unknown, raw: unknown) => Promise<unknown>>());
vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => null },
  ipcMain: { handle: (channel: string, fn: never) => handlers.set(channel, fn) },
}));

import { UserFacingError } from '../src/main/platform/ipc/user-facing-error';
import { defineHandler } from '../src/main/platform/ipc/registry';

const logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
function call(run: () => unknown): Promise<unknown> {
  defineHandler('t', z.void(), run).register(() => true, logger);
  return handlers.get('t')!({ sender: {} }, undefined);
}

describe('defineHandler error boundary (F4, L3)', () => {
  it('reduces a zod failure to one plain sentence', async () => {
    await expect(call(() => z.object({ crew: z.number().min(1) }).parse({ crew: 0 }))).rejects.toThrow(
      /^Invalid request: crew: /,
    );
  });

  it('sends a plain Error so the class name never crosses IPC', async () => {
    const error = await call(() => {
      throw new UserFacingError('Confirm first.');
    }).catch((e: unknown) => e);
    expect(error).toMatchObject({ name: 'Error', message: 'Confirm first.' });
  });

  it('hides SQLite and system error text, logging the original', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(
      'CREATE TABLE a (id TEXT PRIMARY KEY); CREATE TABLE b (a TEXT REFERENCES a(id)); PRAGMA foreign_keys=ON;',
    );
    await expect(call(() => sqlite.exec("INSERT INTO b VALUES ('x')"))).rejects.toThrow(/^Something went wrong/);
    await expect(
      call(() => {
        throw Object.assign(new Error('ENOENT /Users/example/x'), { code: 'ENOENT' });
      }),
    ).rejects.toThrow(/^Something went wrong/);
    expect(logger.error).toHaveBeenCalled();
  });

  it('passes a service refusal through unchanged and genericises a plain Error', async () => {
    await expect(
      call(() => {
        throw new UserFacingError('Confirm this unverified page before starting a run.');
      }),
    ).rejects.toThrow('Confirm this unverified page before starting a run.');
    await expect(
      call(() => {
        throw new TypeError('x is not a function');
      }),
    ).rejects.toThrow(/^Something went wrong/);
  });
});
