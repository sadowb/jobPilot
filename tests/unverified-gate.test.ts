import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobPilotDb } from '../src/main/platform/db/database';
import * as schema from '../src/main/platform/db/schema';
import type { PostingFormDto } from '../src/shared/dto';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import { PostingsRepository } from '../src/main/modules/postings/postings.repository';
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
let sqlite: Database.Database;
const form = (verified: boolean): PostingFormDto => ({
  company: 'Acme',
  title: 'Engineer',
  location: null,
  salary: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  description: null,
  canonical_url: 'https://careers.example.org/role',
  ats: 'custom',
  ats_tenant: null,
  ats_job_id: null,
  questions: [],
  verified,
});

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema }) as JobPilotDb;
  migrate(db, { migrationsFolder: 'drizzle' });
});

describe('unverified postings', () => {
  it('existing and default rows are verified (migration default)', () => {
    sqlite.exec("INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES ('c', 'Acme', 'acme', 1, 1)");
    sqlite.exec(
      "INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, created_at, updated_at) VALUES ('p', 'c', 'https://x.example/', 'https://x.example/', 'custom', 'T', 1, 1)",
    );
    expect(sqlite.prepare("SELECT verified FROM job_posting WHERE id = 'p'").get()).toEqual({ verified: 1 });
  });

  it('exposes verified in the application list and keeps confirmation across re-ingest', () => {
    const repo = new PostingsRepository(db);
    const postingId = repo.ingest(form(false));
    const apps = new ApplicationsService(db);
    const item = apps.create(postingId);
    expect(item.verified).toBe(false);
    repo.confirm(postingId);
    expect(apps.list()[0]!.verified).toBe(true);
    repo.ingest(form(false));
    expect(apps.list()[0]!.verified).toBe(true);
  });

  it('main refuses to start a run until the owner confirms', async () => {
    const repo = new PostingsRepository(db);
    const postingId = repo.ingest(form(false));
    const application = new ApplicationsService(db).create(postingId);
    const agent = { id: 'claude', prepare: async () => undefined } as never;
    const browser = { id: 'neo', closeTab: async () => undefined } as never;
    const service = new RunsService(db, '/nonexistent', agent, browser);
    await expect(service.start(application.id)).rejects.toThrow('Confirm this unverified page');
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM run').get()).toEqual({ n: 0 });
  });

  it('confirm rejects an unknown posting', () => {
    expect(() => new PostingsRepository(db).confirm('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toThrow('Posting is unavailable');
  });
});

describe('re-ingesting a saved posting', () => {
  it('keeps the stored url and canonical url when the same job arrives as another variant', () => {
    const repo = new PostingsRepository(db);
    const first = {
      ...form(true),
      ats: 'lever' as const,
      ats_job_id: '42',
      canonical_url: 'https://jobs.lever.co/acme/42',
    };
    const id = repo.ingest(first);
    expect(repo.ingest({ ...first, canonical_url: 'https://jobs.lever.co/acme/42/apply' })).toBe(id);
    expect(sqlite.prepare('SELECT url, canonical_url FROM job_posting').all()).toEqual([
      { url: 'https://jobs.lever.co/acme/42', canonical_url: 'https://jobs.lever.co/acme/42' },
    ]);
  });
});
