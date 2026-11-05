import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentProvider, RunResult, RunSpec } from '../src/main/platform/agents/types';
import type { BrowserProvider } from '../src/main/platform/browsers/types';
import type { JobPilotDb } from '../src/main/platform/db/database';
import * as schema from '../src/main/platform/db/schema';
import type { PostingFormDto } from '../src/shared/dto';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import { CvDocumentsService } from '../src/main/modules/documents/cv-documents.service';
import { parseGreenhouseSchema } from '../src/main/modules/postings/ats/schema';
import { PostingsRepository } from '../src/main/modules/postings/postings.repository';
import { ProfileRepository } from '../src/main/modules/profile/profile.repository';
import { RunsService } from '../src/main/modules/runs/runs.service';
import { saraProfile } from './helpers-profile';

const fixture: unknown = JSON.parse(readFileSync('tests/fixtures/greenhouse-perpay-5003430007.json', 'utf8'));
let definition: () => Promise<ReturnType<typeof parseGreenhouseSchema> | null>;

vi.mock('../src/main/modules/postings/ats/schema', async (orig) => ({
  ...(await orig<typeof import('../src/main/modules/postings/ats/schema')>()),
  fetchFormSchema: () => definition(),
}));
vi.mock('../src/main/modules/observability/observability.service', () => ({
  AuditService: { record: vi.fn() },
  RunTraceService: { append: vi.fn() },
}));
vi.mock('../src/main/modules/observability/log.service', () => ({
  loggerFor: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
vi.mock('../src/main/platform/ipc/events', () => ({ emitDataChanged: vi.fn() }));
// getProfile() reads the module-level db; the test points it at its own.
vi.mock('../src/main/modules/profile/profile.service', () => ({
  getProfile: (d: JobPilotDb) => new ProfileRepository(d).read(),
}));

const base = { answers_used: [], answers_added: [], questions_needed: [], learned: [], blockers: [] };
let sqlite: Database.Database;
let db: JobPilotDb;
let dir: string;
let services: RunsService[];
let prompts: string[];
let tabs: string[];

const agent: AgentProvider = {
  id: 'claude',
  run: ((spec: RunSpec) => {
    prompts.push(spec.prompt);
    const result = Promise.resolve<RunResult>({ ...base, status: 'filled' });
    return { events: (async function* () {})(), result };
  }) as AgentProvider['run'],
};
const browser: BrowserProvider = {
  id: 'neo',
  mcpServerConfig: async () => ({ type: 'http', url: 'http://127.0.0.1:1/mcp' }),
  openTab: async (runId) => {
    tabs.push(runId);
    return { tabId: `tab-${runId}` };
  },
  closeTab: async () => undefined,
  formSnapshot: async () => ({ hash: 'a'.repeat(64), fields: [{ label: 'First Name', value: 'Sara' }] }),
};

const posting: PostingFormDto = {
  company: 'Perpay',
  title: 'Product Designer',
  location: 'Philadelphia, Pennsylvania, United States',
  salary: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  description: null,
  canonical_url: 'https://boards.greenhouse.io/perpay/jobs/5003430007',
  ats: 'greenhouse',
  ats_tenant: 'perpay',
  ats_job_id: '5003430007',
  questions: [],
  verified: true,
  source: 'fetch',
};
// Greenhouse field names from the recorded posting; not secrets.
const HEAR = 'question_10963307007'; // gitleaks:allow
const INPERSON = 'question_10963310007'; // gitleaks:allow
const runs = () =>
  sqlite.prepare('SELECT id, status, result FROM run ORDER BY created_at, id').all() as {
    id: string;
    status: string;
    result: string | null;
  }[];
const settle = async (until: () => boolean) => {
  for (let i = 0; i < 400 && !until(); i++) await new Promise((resolve) => setTimeout(resolve, 5));
  expect(until()).toBe(true);
};
const setup = async (withCv = true) => {
  new ProfileRepository(db).write(saraProfile());
  if (withCv)
    new CvDocumentsService(db, dir).store({
      name: 'Sara_Benali_CV.pdf',
      bytes: new Uint8Array([37, 80, 68, 70]),
      parsedText: 'Sara Benali\nlinkedin.com/in/sara-benali',
    });
  const svc = new RunsService(db, dir, agent, browser);
  services.push(svc);
  await svc.initialize();
  const id = new ApplicationsService(db).create(new PostingsRepository(db).ingest(posting)).id;
  return { svc, id };
};

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema }) as JobPilotDb;
  migrate(db, { migrationsFolder: 'drizzle' });
  dir = mkdtempSync(join(tmpdir(), 'jobpilot-schema-first-'));
  services = [];
  prompts = [];
  tabs = [];
  definition = async () => parseGreenhouseSchema(fixture);
});
afterEach(async () => {
  await Promise.all(services.map((svc) => svc.stop()));
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('schema-first runs (#237)', () => {
  it('raises only the unanswerable required fields in the Inbox before any browser opens, options included', async () => {
    const { svc, id } = await setup();
    await svc.start(id);
    await settle(() => runs().at(-1)?.status === 'needs_you');
    expect(tabs).toEqual([]);
    expect(prompts).toEqual([]);
    const item = svc.listInbox()[0];
    if (item?.kind !== 'needs_you') throw new Error('expected a needs_you item');
    expect(item.questions.map((q) => q.fieldKey)).toEqual([HEAR, INPERSON]);
    expect(item.questions[0]!.options).toContain('Handshake');
    expect(item.questions[1]!.options).toEqual(['Yes', 'No']);
    expect(item.blockers).toEqual([]);
  });

  it('after the owner answers, the agent gets the plan keyed by real field names and the run reaches review', async () => {
    const { svc, id } = await setup();
    await svc.start(id);
    await settle(() => runs().at(-1)?.status === 'needs_you');
    const first = runs()[0]!;
    await svc.answer({
      runId: first.id,
      answers: [
        { fieldKey: HEAR, answer: 'Handshake' },
        { fieldKey: INPERSON, answer: 'Yes' },
      ],
    });
    await settle(() => runs().at(-1)?.status === 'awaiting_approval');
    expect(tabs).toHaveLength(1);
    const prompt = prompts[0]!;
    expect(prompt).toContain('built from the ATS form definition');
    expect(prompt).toMatch(/Conditional questions appear only after earlier answers/);
    expect(prompt).toMatch(/profile phone always wins/);
    const data = JSON.parse(prompt.split('\n').at(-1)!) as {
      fillPlan: { origin: string; unresolved_required: unknown[]; entries: Array<Record<string, unknown>> };
    };
    expect(data.fillPlan.origin).toBe('ats_schema');
    expect(data.fillPlan.unresolved_required).toEqual([]);
    const by = (key: string) => data.fillPlan.entries.find((e) => e.field_key === key);
    expect(by('question_10963304007')).toMatchObject({ action: 'select', value: '2-5' });
    expect(by(HEAR)).toMatchObject({ value: 'Handshake', source: 'owner' });
    expect(by('resume')).toMatchObject({ action: 'upload_cv', value: 'Sara_Benali_CV.pdf' });
    expect(by('question_10963308007')).toMatchObject({ action: 'draft' });
  });

  it('remembers a repeated per-job answer in the library so the next job does not ask again', async () => {
    const { svc, id } = await setup();
    await svc.start(id);
    await settle(() => runs().at(-1)?.status === 'needs_you');
    await svc.answer({
      runId: runs()[0]!.id,
      answers: [
        { fieldKey: HEAR, answer: 'Google' },
        { fieldKey: INPERSON, answer: 'Yes' },
      ],
    });
    const library = sqlite.prepare('SELECT canonical_key AS k, answer FROM answer_library').all();
    // "How did you hear" is kept; the in-person acknowledgement is specific to this job and is not.
    expect(library).toEqual([{ k: 'referral_source', answer: 'Google' }]);
  });

  it('asks for the CV as a blocker, not a question, when none is stored', async () => {
    const { svc, id } = await setup(false);
    await svc.start(id);
    await settle(() => runs().at(-1)?.status === 'needs_you');
    const item = svc.listInbox()[0];
    if (item?.kind !== 'needs_you') throw new Error('expected a needs_you item');
    expect(item.blockers.map((b) => b.message).join()).toMatch(/Resume\/CV/);
    expect(tabs).toEqual([]);
  });

  it.each([
    ['404', () => Promise.reject(new Error('HTTP 404 for boards-api.greenhouse.io'))],
    ['an ATS without an adapter', () => Promise.resolve(null)],
  ])('falls back to the page-reading path on %s', async (_name, outcome) => {
    definition = outcome as typeof definition;
    const { svc, id } = await setup();
    await svc.start(id);
    await settle(() => runs().at(-1)?.status === 'awaiting_approval');
    expect(tabs).toHaveLength(1);
    const prompt = prompts[0]!;
    expect(prompt).not.toContain('built from the ATS form definition');
    expect(JSON.parse(prompt.split('\n').at(-1)!).fillPlan.origin).toBe('page');
  });
});
