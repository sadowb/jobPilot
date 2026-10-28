import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDBClient, SqliteQueue } from 'liteque';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApplyWorker } from '../src/main/platform/queue/apply';

const stale = '01JZ0000000000000000000001';
const crashed = '01JZ0000000000000000000002';
const fresh = '01JZ0000000000000000000003';
let dir: string;
let file: string;

const rows = () => {
  const db = buildDBClient(file);
  try {
    return db.$client.prepare('SELECT status FROM tasks WHERE queue = ?').all('apply') as { status: string }[];
  } finally {
    db.$client.close();
  }
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobpilot-apply-'));
  file = join(dir, 'apply-queue.db');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('ApplyWorker startup cleanup', () => {
  it('drops stale queued rows and crashed running rows, then re-enqueues', async () => {
    const seed = buildDBClient(file, { runMigrations: true });
    const queue = new SqliteQueue<{ runId: string }>('apply', seed, {
      defaultJobArgs: { numRetries: 0 },
      keepFailedJobs: false,
    });
    await queue.enqueue({ runId: stale }, { idempotencyKey: stale });
    await queue.enqueue({ runId: crashed }, { idempotencyKey: crashed });
    await queue.attemptDequeue({ timeoutSecs: 60 }); // oldest -> status 'running', as after a crash
    expect(
      rows()
        .map((r) => r.status)
        .sort(),
    ).toEqual(['pending', 'running']);
    seed.$client.close();

    const worker = new ApplyWorker(
      file,
      1,
      async () => undefined,
      async () => undefined,
      () => undefined,
    );
    await worker.enqueue(fresh);
    expect(rows().map((r) => r.status)).toEqual(['pending']);
    await worker.stop();
  });
});
