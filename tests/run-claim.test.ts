import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobPilotDb } from '../src/main/platform/db/database';
import * as schema from '../src/main/platform/db/schema';
import { RunsRepository } from '../src/main/modules/runs/runs.repository';
import { AuditService } from '../src/main/modules/observability/observability.service';
import { RunsService } from '../src/main/modules/runs/runs.service';

vi.mock('../src/main/modules/observability/observability.service', () => ({
  AuditService: { record: vi.fn() },
  RunTraceService: { append: vi.fn() },
}));
vi.mock('../src/main/modules/observability/log.service', () => ({
  loggerFor: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
vi.mock('../src/main/platform/ipc/events', () => ({ emitDataChanged: vi.fn() }));

let db: JobPilotDb;
let repository: RunsRepository;
let dir: string;

const queued = (applicationId: string, createdAt: number) =>
  repository.create({ applicationId, agent: 'claude', browser: 'neo', createdAt })!;

beforeEach(() => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = OFF'); // runs here have no application rows
  db = drizzle(sqlite, { schema }) as JobPilotDb;
  migrate(db, { migrationsFolder: 'drizzle' });
  repository = new RunsRepository(db);
  dir = mkdtempSync(join(tmpdir(), 'jobpilot-runs-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('RunsRepository.claim', () => {
  it('claims the oldest queued run exactly once and mints a session id', () => {
    const second = queued('app-2', 2000);
    const first = queued('app-1', 1000);
    const a = repository.claim('11111111-1111-4111-8111-111111111111')!;
    const b = repository.claim('22222222-2222-4222-8222-222222222222')!;
    expect([a.id, b.id]).toEqual([first.id, second.id]);
    expect(a).toMatchObject({ status: 'running', attempts: 1, sessionId: '11111111-1111-4111-8111-111111111111' });
    expect(a.progressAt).toBe(a.claimedAt);
    expect(repository.claim('33333333-3333-4333-8333-333333333333')).toBeUndefined();
  });

  it('keeps the session id and counts attempts when a run is re-claimed', () => {
    const row = queued('app-1', 1000);
    repository.claim('11111111-1111-4111-8111-111111111111');
    repository.update(row.id, { status: 'queued' });
    const again = repository.claim('22222222-2222-4222-8222-222222222222')!;
    expect(again).toMatchObject({ attempts: 2, sessionId: '11111111-1111-4111-8111-111111111111' });
  });
});

describe('RunsService.initialize', () => {
  it('requeues interrupted runs under three attempts and fails the third', async () => {
    const fresh = queued('app-1', 1000);
    const worn = queued('app-2', 2000);
    repository.update(fresh.id, { status: 'running', attempts: 1 });
    repository.update(worn.id, { status: 'running', attempts: 3 });
    writeFileSync(join(dir, 'apply-queue.db'), 'stale');
    const service = new RunsService(db, dir);
    await service.initialize();
    await service.stop();
    // Requeued (audited) and re-claimed by the resumed pump; it only fails afterwards because the test has no provider.
    expect(AuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ runId: fresh.id, fromStatus: 'running', toStatus: 'queued' }),
    );
    expect(repository.get(fresh.id).attempts).toBe(2);
    expect(existsSync(join(dir, 'apply-queue.db'))).toBe(false);
    expect(repository.get(worn.id)).toMatchObject({ status: 'failed', error: 'interrupted repeatedly' });
  });
});
