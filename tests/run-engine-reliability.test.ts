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
import type { AgentProvider, RunResult, RunSpec } from '../src/main/platform/agents/types';
import type { BrowserProvider } from '../src/main/platform/browsers/types';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import { PostingsRepository } from '../src/main/modules/postings/postings.repository';
import { GrantsService } from '../src/main/modules/grants/grants.service';
import { RunsService } from '../src/main/modules/runs/runs.service';

const { warn, info } = vi.hoisted(() => ({ warn: vi.fn(), info: vi.fn() }));
vi.mock('../src/main/modules/observability/observability.service', () => ({
  AuditService: { record: vi.fn() },
  RunTraceService: { append: vi.fn() },
}));
vi.mock('../src/main/modules/observability/log.service', () => ({
  loggerFor: () => ({ info, error: vi.fn(), warn, debug: vi.fn() }),
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
  run: ((spec: RunSpec) => {
    agentStarted();
    // Real providers reject on abort; do the same so cancel/quit paths are exercised.
    const result = new Promise<RunResult>((resolve, reject) => {
      spec.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      agentResult().then((value) => resolve(value as RunResult), reject);
    });
    result.catch(() => undefined);
    return { events: (async function* () {})(), result };
  }) as AgentProvider['run'],
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
  formSnapshot: async () => ({ hash: 'hash', fields: [{ label: 'Name', value: 'Sara' }] }),
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
  info.mockClear();
});
afterEach(async () => {
  await Promise.allSettled(services.map((s) => s.stop()));
  rmSync(dir, { recursive: true, force: true });
});

const lastRun = () => rows().at(-1)!;
const never = () => new Promise<never>(() => undefined);

describe('a failed run always says why (#245)', () => {
  const failWith = async (outcome: () => Promise<unknown>) => {
    agentResult = outcome;
    const svc = service();
    await svc.initialize();
    await svc.start(application());
    await settle(() => rows()[0]?.status === 'failed');
    return rows()[0]!;
  };

  it('stores the first blocker when the agent itself returns failed, and logs the class', async () => {
    const row = await failWith(async () => ({
      ...filled,
      status: 'failed',
      blockers: [{ kind: 'other', message: 'The   form\nnever loaded' }],
    }));
    expect(row.error).toBe('The agent could not complete the form: The form never loaded');
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ blockers: ['other'] }),
      'Run ended failed: the agent reported it could not complete the form',
    );
  });

  it('still gives a sentence when the agent reports failed with no blocker', async () => {
    const row = await failWith(async () => ({ ...filled, status: 'failed' }));
    expect(row.error).toBe('The agent reported that it could not complete the form.');
  });

  it('keeps a curated provider message, e.g. a timeout', async () => {
    expect((await failWith(() => Promise.reject(new Error('Claude run timed out.')))).error).toBe(
      'Claude run timed out.',
    );
  });

  it('names the invalid fields of an unreadable result but never quotes its values', async () => {
    const row = await failWith(async () => ({ ...filled, status: 'finished', blockers: 'secret-value' }));
    expect(row.error).toMatch(/^Unexpected data from the agent or browser \(/);
    expect(row.error).toContain('status:invalid_value');
    expect(row.error).toContain('blockers:invalid_type');
    expect(row.error).not.toContain('secret-value');
  });

  it('falls back to the generic line when a message could carry a path', async () => {
    const row = await failWith(() => Promise.reject(new Error("ENOENT: no such file '/home/sara/cv.pdf'")));
    expect(row.error).toBe('Provider failed or returned an invalid result');
  });
});

describe('revoking a connection stops the runs that use it (#238)', () => {
  const runningRun = async () => {
    let started = false;
    agentResult = never;
    agentStarted = () => (started = true);
    const svc = service();
    await svc.initialize();
    await svc.start(application());
    await settle(() => started);
    return svc;
  };

  it('cancels a running run on the revoked browser, records why, and closes its tab', async () => {
    const svc = await runningRun();
    await svc.cancelUsing('browser', 'neo');
    expect(lastRun()).toMatchObject({ status: 'cancelled', error: 'Stopped: you turned off the browser tool.' });
    await settle(() => closed.length > 0);
  });

  it('cancels a queued run too, and leaves runs on other providers alone', async () => {
    const svc = await runningRun();
    await svc.cancelUsing('agent', 'codex');
    expect(lastRun().status).toBe('running');
    await svc.cancelUsing('agent', 'claude');
    expect(lastRun().status).toBe('cancelled');
  });

  it('GrantsService.revoke tells its listener which provider went off', () => {
    const grants = new GrantsService(db);
    const seen: Array<[string, string]> = [];
    grants.onRevoked((kind, provider) => seen.push([kind, provider]));
    const granted = grants.allow('browser', 'neo');
    expect(seen).toEqual([]);
    grants.revoke(granted.id);
    expect(seen).toEqual([['browser', 'neo']]);
  });
});

describe('a removed application can be added again (#234)', () => {
  const setup = () => {
    const postingId = new PostingsRepository(db).ingest(form('https://careers.example.org/readd'));
    const apps = new ApplicationsService(db);
    return { apps, postingId, id: apps.create(postingId).id };
  };

  it('stops counting as tracked and leaves the list, then comes back on re-add', () => {
    const { apps, postingId, id } = setup();
    expect(apps.hasPosting(postingId)).toBe(true);
    apps.remove(id);
    expect(apps.hasPosting(postingId)).toBe(false);
    expect(apps.list().map((item) => item.id)).not.toContain(id);
    expect(apps.create(postingId).id).toBe(id);
    expect(apps.hasPosting(postingId)).toBe(true);
  });

  it('is idempotent and undoable', () => {
    const { apps, id } = setup();
    apps.remove(id);
    expect(() => apps.remove(id)).not.toThrow();
    expect(apps.restore(id).id).toBe(id);
    expect(apps.restore(id).id).toBe(id);
    expect(apps.list().map((item) => item.id)).toContain(id);
  });

  it('refuses a submitted application and one with a live run', async () => {
    const { apps, id } = setup();
    agentResult = never;
    const svc = service();
    await svc.initialize();
    await svc.start(id);
    expect(() => apps.remove(id)).toThrow('Cancel the run first');
    await svc.cancel(rows()[0]!.id);
    expect(() => apps.remove(id)).not.toThrow();
    const applied = setup2(apps);
    expect(() => apps.remove(applied)).toThrow('stays in your history');
  });

  it('refuses an unknown id', () => {
    expect(() => new ApplicationsService(db).remove('01HZZZZZZZZZZZZZZZZZZZZZZZ')).toThrow('not found');
  });

  const setup2 = (apps: ApplicationsService) => {
    const postingId = new PostingsRepository(db).ingest(form('https://careers.example.org/applied'));
    const id = apps.create(postingId).id;
    apps.markApplied(id, '01HZZZZZZZZZZZZZZZZZZZZZZZ');
    return id;
  };
});
