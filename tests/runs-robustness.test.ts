import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobPilotDb } from '../src/main/platform/db/database';
import * as schema from '../src/main/platform/db/schema';
import type { PostingFormDto } from '../src/shared/dto';
import { CREW_DEFAULT } from '../src/shared/dto';
import type { AgentProvider, RunResult, RunSpec } from '../src/main/platform/agents/types';
import type { BrowserProvider } from '../src/main/platform/browsers/types';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import { PostingsRepository } from '../src/main/modules/postings/postings.repository';
import { RunsService } from '../src/main/modules/runs/runs.service';
import { SettingsRepository } from '../src/main/modules/settings/settings.repository';
import {
  applyConcurrency,
  getSettings,
  runPreferences,
  runsPaused,
} from '../src/main/modules/settings/settings.service';

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('../src/main/modules/observability/observability.service', () => ({
  AuditService: { record: vi.fn() },
  RunTraceService: { append: vi.fn() },
}));
vi.mock('../src/main/modules/observability/log.service', () => ({
  loggerFor: () => ({ info: vi.fn(), error: vi.fn(), warn, debug: vi.fn() }),
}));
vi.mock('../src/main/platform/ipc/events', () => ({ emitDataChanged: vi.fn() }));

const filled: RunResult = {
  status: 'filled',
  answers_used: [],
  answers_added: [],
  questions_needed: [],
  learned: [],
  blockers: [],
};

let sqlite: Database.Database;
let db: JobPilotDb;
let dir: string;
let services: RunsService[];
let opened: string[];
let closed: string[];
let agentResult: () => Promise<unknown>;
let agentStarted: () => void;

const agent: AgentProvider = {
  id: 'claude',
  run: (spec: RunSpec) => {
    agentStarted();
    // Real providers reject on abort; do the same so cancel/quit paths are exercised.
    const result = new Promise<RunResult>((resolve, reject) => {
      spec.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      agentResult().then((value) => resolve(value as RunResult), reject);
    });
    result.catch(() => undefined);
    return { events: (async function* () {})(), result };
  },
};
const browser: BrowserProvider = {
  id: 'neo',
  mcpServerConfig: async () => ({ type: 'http', url: 'http://127.0.0.1:1/mcp' }),
  openTab: async (runId, url) => {
    opened.push(url);
    return { tabId: `tab-${runId}` };
  },
  closeTab: async (runId) => {
    closed.push(runId);
  },
  formHash: async () => 'hash',
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
});

let n = 0;
const application = (url = 'https://careers.example.org/role') => {
  const postingId = new PostingsRepository(db).ingest({ ...form(`${url}/${n}`), title: `Engineer ${n++}` });
  return new ApplicationsService(db).create(postingId).id;
};
const service = () => {
  const created = new RunsService(db, dir, agent, browser);
  services.push(created);
  return created;
};
const rows = () =>
  sqlite.prepare('SELECT id, status, error, attempts FROM run ORDER BY created_at, id').all() as {
    id: string;
    status: string;
    error: string | null;
    attempts: number;
  }[];
const settle = async (until: () => boolean) => {
  for (let i = 0; i < 200 && !until(); i++) await new Promise((resolve) => setTimeout(resolve, 5));
  expect(until()).toBe(true);
};
const approvals = () => sqlite.prepare('SELECT status, decided_by FROM approval').all();

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema }) as JobPilotDb;
  migrate(db, { migrationsFolder: 'drizzle' });
  dir = mkdtempSync(join(tmpdir(), 'jobpilot-runs-robust-'));
  services = [];
  opened = [];
  closed = [];
  agentResult = async () => filled;
  agentStarted = () => undefined;
  warn.mockClear();
});
afterEach(async () => {
  await Promise.allSettled(services.map((s) => s.stop()));
  rmSync(dir, { recursive: true, force: true });
});

describe('F1 tolerant settings reads', () => {
  it.each([65, 0, 'abc', 1.5, {}])('falls back to the default crew for stored %j', (stored) => {
    new SettingsRepository(db).setSetting('runs.concurrency', stored);
    expect(applyConcurrency(db)).toBe(CREW_DEFAULT);
    expect(getSettings(db).crew).toBe(CREW_DEFAULT);
  });

  it('keeps a valid stored crew and does not warn', () => {
    new SettingsRepository(db).setSetting('runs.concurrency', 64);
    expect(applyConcurrency(db)).toBe(64);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns without the value and defaults invalid limits, sites, mode and agent preferences', () => {
    const repo = new SettingsRepository(db);
    repo.setSetting('runs.limits', { runSeconds: 'secret-ish' });
    repo.setSetting('runs.sites', 'nope');
    repo.setSetting('runs.submitMode', 42);
    repo.setSetting('agents.claude', { model: 12 });
    const settings = getSettings(db);
    expect(settings.limits.runSeconds).toBe(540);
    expect(settings.submitMode).toBe('review');
    expect(settings.sites).toEqual({});
    expect(runPreferences(db).stuckMs).toBe(120_000);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-ish');
    expect(warn).toHaveBeenCalled();
  });

  it('RunsService.initialize survives an invalid stored crew', async () => {
    new SettingsRepository(db).setSetting('runs.concurrency', 'abc');
    await expect(service().initialize()).resolves.toBeUndefined();
  });
});

describe('F2 persisted pause', () => {
  it('persists pause and resume and honours a stored pause at launch', async () => {
    const first = service();
    await first.initialize();
    first.pause();
    expect(runsPaused(db)).toBe(true);
    const second = service();
    await second.initialize();
    const id = application();
    await second.start(id);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(rows().map((r) => r.status)).toEqual(['queued']);
    second.resume();
    expect(runsPaused(db)).toBe(false);
    await settle(() => rows()[0]?.status === 'awaiting_approval');
  });

  it('starts paused after an unclean exit and keeps interrupted-repeatedly semantics', async () => {
    const [a, b] = [application(), application()];
    const repo = sqlite.prepare(
      "INSERT INTO run (id, application_id, status, agent, browser, attempts, session_id, created_at, updated_at) VALUES (?, ?, 'running', 'claude', 'neo', ?, 's', ?, ?)",
    );
    repo.run('01ARZ3NDEKTSV4RRFFQ69G5FA1', a, 1, 1, 1);
    repo.run('01ARZ3NDEKTSV4RRFFQ69G5FA2', b, 3, 2, 2);
    const relaunched = service();
    await relaunched.initialize();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(rows().map((r) => [r.status, r.error])).toEqual([
      ['queued', null],
      ['failed', 'interrupted repeatedly'],
    ]);
    expect(runsPaused(db)).toBe(true);
    expect(opened).toEqual([]);
    relaunched.resume();
    await settle(() => rows()[0]?.status === 'awaiting_approval');
  });
});

describe('F3/O1 awaiting_approval', () => {
  const awaiting = async () => {
    const svc = service();
    await svc.initialize();
    const id = application();
    const run = await svc.start(id);
    await settle(() => rows()[0]?.status === 'awaiting_approval');
    return { svc, id, run };
  };

  it('cancel moves it to cancelled, rejects the approval and closes the tab', async () => {
    const { svc, run } = await awaiting();
    expect(approvals()).toEqual([{ status: 'pending', decided_by: null }]);
    closed.length = 0;
    expect((await svc.cancel(run.id)).status).toBe('cancelled');
    expect(approvals()).toEqual([{ status: 'rejected', decided_by: 'owner' }]);
    expect(closed).toContain(run.id);
  });

  it('start returns the existing run and keeps the pending approval', async () => {
    const { svc, id, run } = await awaiting();
    expect((await svc.start(id)).id).toBe(run.id);
    expect(rows()).toHaveLength(1);
    expect(approvals()).toEqual([{ status: 'pending', decided_by: null }]);
  });
});

describe('F4 URL guard', () => {
  it.each(['javascript:alert(1)', 'file:///etc/hosts', 'data:text/html,hi', 'https://user:pw@example.org/x'])(
    'fails the run before the browser opens %s',
    async (url) => {
      const svc = service();
      await svc.initialize();
      sqlite.pragma('foreign_keys = OFF');
      const id = application();
      sqlite
        .prepare(
          'UPDATE job_posting SET canonical_url = ? WHERE id = (SELECT posting_id FROM application WHERE id = ?)',
        )
        .run(url, id);
      await svc.start(id);
      await settle(() => rows()[0]?.status === 'failed');
      expect(rows()[0]!.error).toMatch(/posting URL/);
      expect(opened).toEqual([]);
    },
  );
});

describe('F5 graceful quit', () => {
  it('re-queues an in-flight run, keeps the queue paused, and the next launch waits for resume', async () => {
    let started!: () => void;
    const running = new Promise<void>((resolve) => (started = resolve));
    agentResult = () => new Promise(() => undefined); // never settles; only abort ends it
    agentStarted = started;
    const svc = service();
    await svc.initialize();
    await svc.start(application());
    await running;
    await svc.stop();
    expect(rows().map((r) => r.status)).toEqual(['queued']);
    expect(runsPaused(db)).toBe(true);

    agentResult = async () => filled;
    const next = service();
    await next.initialize();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(rows().map((r) => r.status)).toEqual(['queued']);
    next.resume();
    await settle(() => rows()[0]?.status === 'awaiting_approval');
  });
});

describe('F7 result cap', () => {
  it('fails an oversized agent result with a clear error', async () => {
    agentResult = async () => ({ ...filled, learned: ['x'.repeat(300 * 1024)] });
    const svc = service();
    await svc.initialize();
    await svc.start(application());
    await settle(() => rows()[0]?.status === 'failed');
    expect(rows()[0]!.error).toBe('The agent result is too large.');
  });
});
