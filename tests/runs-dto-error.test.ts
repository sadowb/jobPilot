import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobPilotDb } from '../src/main/platform/db/database';
import * as schema from '../src/main/platform/db/schema';
import { RunSummarySchema } from '../src/shared/dto';
import type { PostingFormDto } from '../src/shared/dto';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import { PostingsRepository } from '../src/main/modules/postings/postings.repository';
import { RunsService } from '../src/main/modules/runs/runs.service';
import type { AgentProvider } from '../src/main/platform/agents/types';
import type { BrowserProvider } from '../src/main/platform/browsers/types';

vi.mock('../src/main/modules/observability/observability.service', () => ({
  AuditService: { record: vi.fn() },
  RunTraceService: { append: vi.fn() },
}));
vi.mock('../src/main/modules/observability/log.service', () => ({
  loggerFor: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
vi.mock('../src/main/platform/ipc/events', () => ({ emitDataChanged: vi.fn() }));

describe('Issue #197: RunSummarySchema DTO and error mapping', () => {
  it('parses valid run summaries with error string, null, or undefined', () => {
    const ulid1 = '01ARZ3NDEKTSV4RRFFQ69G5FA1';
    const ulid2 = '01ARZ3NDEKTSV4RRFFQ69G5FA2';

    const withError = RunSummarySchema.parse({
      id: ulid1,
      applicationId: ulid2,
      status: 'failed',
      startedAt: 1000,
      finishedAt: 2000,
      error: 'Open Settings → Agent to configure Claude.',
    });
    expect(withError.error).toBe('Open Settings → Agent to configure Claude.');

    const withNull = RunSummarySchema.parse({
      id: ulid1,
      applicationId: ulid2,
      status: 'running',
      startedAt: 1000,
      finishedAt: null,
      error: null,
    });
    expect(withNull.error).toBeNull();

    const withoutError = RunSummarySchema.parse({
      id: ulid1,
      applicationId: ulid2,
      status: 'queued',
      startedAt: null,
      finishedAt: null,
    });
    expect(withoutError.error).toBeUndefined();
  });

  it('rejects invalid error types', () => {
    const ulid1 = '01ARZ3NDEKTSV4RRFFQ69G5FA1';
    const ulid2 = '01ARZ3NDEKTSV4RRFFQ69G5FA2';

    expect(() =>
      RunSummarySchema.parse({
        id: ulid1,
        applicationId: ulid2,
        status: 'failed',
        startedAt: 1000,
        finishedAt: 2000,
        error: 12345,
      }),
    ).toThrow();
  });
});

describe('Issue #197: RunsService carries stored error on failed transitions', () => {
  let sqlite: Database.Database;
  let db: JobPilotDb;
  let dir: string;
  let service: RunsService;

  const agent: AgentProvider = {
    id: 'claude',
    run: () => {
      throw new Error('tool_not_installed');
    },
  };

  const browser: BrowserProvider = {
    id: 'neo',
    mcpServerConfig: async () => ({ type: 'http', url: 'http://127.0.0.1:1/mcp' }),
    openTab: async (runId) => ({ tabId: `tab-${runId}` }),
    closeTab: async () => undefined,
    formSnapshot: async () => ({ hash: 'hash', fields: [{ label: 'Full name', value: 'Sara Benali' }] }),
  };

  const form = (url: string): PostingFormDto => ({
    company: 'Acme',
    title: 'Engineer',
    location: null,
    salary: null,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    description: null,
    canonical_url: url,
    ats: 'custom',
    ats_tenant: null,
    ats_job_id: null,
    questions: [],
    verified: true,
    source: 'fetch',
  });

  beforeEach(() => {
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema }) as JobPilotDb;
    migrate(db, { migrationsFolder: 'drizzle' });
    dir = mkdtempSync(join(tmpdir(), 'jobpilot-runs-dto-'));
    service = new RunsService(db, dir, agent, browser);
  });

  afterEach(async () => {
    await service.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it('preserves user-facing error text in RunsService.list()', async () => {
    const postingId = new PostingsRepository(db).ingest(form('https://example.com/job'));
    const appId = new ApplicationsService(db).create(postingId).id;

    // Directly insert a failed run with an error
    const runId = '01ARZ3NDEKTSV4RRFFQ69G5FA1';
    const now = Date.now();
    sqlite
      .prepare(
        `INSERT INTO run (id, application_id, status, agent, browser, error, created_at, updated_at)
         VALUES (?, ?, 'failed', 'claude', 'neo', ?, ?, ?)`,
      )
      .run(runId, appId, 'Open Settings → Agent to configure Claude.', now, now);

    const runs = service.list();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      id: runId,
      applicationId: appId,
      status: 'failed',
      error: 'Open Settings → Agent to configure Claude.',
    });
  });
});
