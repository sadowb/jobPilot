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
import type { BrowserProvider, SubmitAuthorisation } from '../src/main/platform/browsers/types';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import { PostingService } from '../src/main/modules/postings/postings.service';
import { PostingsRepository } from '../src/main/modules/postings/postings.repository';
import { RunsService } from '../src/main/modules/runs/runs.service';
import { AuditService } from '../src/main/modules/observability/observability.service';

vi.mock('../src/main/modules/observability/observability.service', () => ({
  AuditService: { record: vi.fn() },
  RunTraceService: { append: vi.fn() },
}));
vi.mock('../src/main/modules/observability/log.service', () => ({
  loggerFor: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
vi.mock('../src/main/platform/ipc/events', () => ({ emitDataChanged: vi.fn() }));

const base = { answers_used: [], answers_added: [], questions_needed: [], learned: [], blockers: [] };
const filled: RunResult = { ...base, status: 'filled' };
const submitted: RunResult = { ...base, status: 'submitted' };

let sqlite: Database.Database;
let db: JobPilotDb;
let dir: string;
let services: RunsService[];
let hash: string;
let tabs: Set<string>;
let formFields: Array<{ label: string; value: string }>;
let fillResult: RunResult;
let submitBehaviour: (auth: SubmitAuthorisation) => Promise<RunResult>;
let submitRuns: number;
let auth: SubmitAuthorisation | undefined;
let prepare: () => Promise<void>;
let hold: Promise<void> | undefined;
let held: Set<string>;

const agent: AgentProvider = {
  id: 'claude',
  prepare: () => prepare(),
  run: ((spec: RunSpec) => {
    const isSubmit = spec.prompt.includes('The owner approved this exact filled application');
    if (isSubmit) submitRuns++;
    const result = (async () => {
      if (!isSubmit) return fillResult;
      await hold;
      return submitBehaviour(auth!);
    })();
    result.catch(() => undefined);
    return { events: (async function* () {})(), result };
  }) as AgentProvider['run'],
};
const browser: BrowserProvider = {
  id: 'neo',
  mcpServerConfig: async (_runId, _signal, submit) => {
    auth = submit;
    return { type: 'http', url: 'http://127.0.0.1:1/mcp' };
  },
  openTab: async (runId) => {
    tabs.add(runId);
    return { tabId: `tab-${runId}` };
  },
  closeTab: async (runId) => {
    tabs.delete(runId);
  },
  formSnapshot: async (runId) => {
    if (!tabs.has(runId)) throw new Error('Run tab is unavailable.');
    return { hash, fields: formFields };
  },
  holdTab: (runId) => {
    if (!tabs.has(runId)) return false;
    held.add(runId);
    return true;
  },
  releaseTab: (runId) => void held.delete(runId),
  isHeld: (runId) => held.has(runId),
  tabLocation: async (runId) =>
    tabs.has(runId) ? { tabId: `tab-${runId}`, url: 'https://careers.example.org/role/1' } : null,
};

const form = (n: number): PostingFormDto => ({
  company: 'Acme',
  title: `Engineer ${n}`,
  location: null,
  salary: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  description: null,
  canonical_url: `https://careers.example.org/role/${n}`,
  ats: 'custom',
  ats_tenant: null,
  ats_job_id: null,
  questions: [
    {
      external_id: 'why',
      label: 'Why Acme?',
      type: 'textarea',
      required: true,
      options: [],
      position: 0,
      canonical_key: null,
    },
  ],
  verified: true,
  source: 'fetch',
});
let n = 0;
const application = () => {
  const postingId = new PostingsRepository(db).ingest(form(n++));
  return new ApplicationsService(db).create(postingId).id;
};
const service = () => {
  const created = new RunsService(db, dir, agent, browser);
  services.push(created);
  return created;
};
const rows = () =>
  sqlite.prepare('SELECT id, status, error FROM run ORDER BY created_at, id').all() as {
    id: string;
    status: string;
    error: string | null;
  }[];
const approval = () =>
  sqlite.prepare('SELECT id, status, submit_claimed_at AS claimed FROM approval ORDER BY created_at, id').all() as {
    id: string;
    status: string;
    claimed: number | null;
  }[];
const applied = (id: string) =>
  sqlite.prepare('SELECT status, applied_at AS at FROM application WHERE id = ?').get(id) as {
    status: string;
    at: number | null;
  };
const settle = async (until: () => boolean) => {
  for (let i = 0; i < 400 && !until(); i++) await new Promise((resolve) => setTimeout(resolve, 5));
  expect(until()).toBe(true);
};
const clickOnce: typeof submitBehaviour = async (a) => {
  expect(a.claim()).toBe(true);
  return submitted;
};

/** Start a run and wait until its form is waiting for review. */
const review = async () => {
  const svc = service();
  await svc.initialize();
  const id = application();
  await svc.start(id);
  await settle(() => rows().at(-1)?.status === 'awaiting_approval');
  const entry = svc.listInbox().find((item) => item.kind === 'approval');
  if (entry?.kind !== 'approval') throw new Error('no approval in the inbox');
  return { svc, id, entry };
};

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema }) as JobPilotDb;
  migrate(db, { migrationsFolder: 'drizzle' });
  dir = mkdtempSync(join(tmpdir(), 'jobpilot-approvals-'));
  services = [];
  tabs = new Set();
  held = new Set();
  hash = 'a'.repeat(64);
  formFields = [
    { label: 'Full name', value: 'Sara Benali' },
    { label: 'Why Acme?', value: 'I like the product.' },
  ];
  fillResult = filled;
  submitBehaviour = clickOnce;
  submitRuns = 0;
  auth = undefined;
  prepare = async () => undefined;
  hold = undefined;
  vi.mocked(AuditService.record).mockClear();
});
afterEach(async () => {
  await Promise.allSettled(services.map((s) => s.stop()));
  rmSync(dir, { recursive: true, force: true });
});

describe('review: what the owner is shown', () => {
  it('stores the form read back from the tab and the hash it is bound to', async () => {
    const { entry } = await review();
    expect(entry.state).toBe('pending');
    expect(entry.summary.fields).toEqual(formFields);
    expect(entry.formRef).toBe(hash.slice(0, 12));
    expect(entry.company).toBe('Acme');
    expect(sqlite.prepare('SELECT form_hash FROM approval').get()).toEqual({ form_hash: hash });
    expect(AuditService.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'approval_requested' }));
  });

  it('never offers an unreadable (empty) form for approval', async () => {
    formFields = [];
    const svc = service();
    await svc.initialize();
    await svc.start(application());
    await settle(() => rows().at(-1)?.status === 'needs_you');
    expect(approval()).toEqual([]);
    expect(svc.listInbox().map((item) => item.kind)).toEqual(['needs_you']);
  });
});

describe('approve', () => {
  it('submits once on the approved hash and marks the application applied', async () => {
    const { svc, id, entry } = await review();
    const result = await svc.approve(entry.approvalId);
    expect(result.outcome).toBe('submitting');
    await settle(() => rows().at(-1)?.status === 'submitted');
    expect(auth?.formHash).toBe(hash);
    expect(approval()).toEqual([{ id: entry.approvalId, status: 'approved', claimed: expect.any(Number) }]);
    expect(applied(id).status).toBe('applied');
    expect(applied(id).at).not.toBeNull();
    expect(tabs.size).toBe(0);
    expect(svc.listInbox()).toEqual([]);
  });

  it('a double click and a later retry start exactly one submit', async () => {
    let release!: () => void;
    hold = new Promise((resolve) => (release = resolve));
    const { svc, entry } = await review();
    const [a, b] = await Promise.all([svc.approve(entry.approvalId), svc.approve(entry.approvalId)]);
    expect([a.outcome, b.outcome].sort()).toEqual(['already_decided', 'submitting']);
    expect((await svc.approve(entry.approvalId)).outcome).toBe('already_decided');
    release();
    await settle(() => rows().at(-1)?.status === 'submitted');
    expect(submitRuns).toBe(1);
    expect((await svc.approve(entry.approvalId)).outcome).toBe('already_decided');
    expect(submitRuns).toBe(1);
  });

  it('the click claim is durable and single-use', async () => {
    let second: boolean | undefined;
    submitBehaviour = async (a) => {
      a.claim();
      second = a.claim();
      return submitted;
    };
    const { svc, entry } = await review();
    await svc.approve(entry.approvalId);
    await settle(() => rows().at(-1)?.status === 'submitted');
    expect(second).toBe(false);
  });

  it('shows the approval as submitting and refuses cancel while the submit is in flight', async () => {
    let release!: () => void;
    hold = new Promise((resolve) => (release = resolve));
    const { svc, entry } = await review();
    await svc.approve(entry.approvalId);
    expect(svc.listInbox().map((item) => item.kind === 'approval' && item.state)).toEqual(['submitting']);
    await expect(svc.cancel(entry.runId)).rejects.toThrow(/being submitted/);
    release();
    await settle(() => rows().at(-1)?.status === 'submitted');
  });

  it('fails closed when the form drifted: nothing is sent and a fresh fill is queued for review', async () => {
    const { svc, id, entry } = await review();
    hash = 'b'.repeat(64);
    const result = await svc.approve(entry.approvalId);
    expect(result.outcome).toBe('form_changed');
    expect(submitRuns).toBe(0);
    const [old, fresh] = rows();
    expect(old).toMatchObject({ status: 'failed', error: expect.stringMatching(/changed after you reviewed/) });
    expect(approval()[0]!.status).toBe('expired');
    expect(['queued', 'running', 'awaiting_approval']).toContain(fresh?.status);
    expect(applied(id).at).toBeNull();
    // The stale card can no longer be approved, even if the new form hashes back to the old value.
    hash = 'a'.repeat(64);
    expect((await svc.approve(entry.approvalId)).outcome).toBe('already_decided');
    expect(submitRuns).toBe(0);
    await settle(() => rows().at(-1)?.status === 'awaiting_approval');
    const next = svc.listInbox().find((item) => item.kind === 'approval');
    expect(next?.kind === 'approval' && next.approvalId).not.toBe(entry.approvalId);
  });

  it('treats a lost tab (app restarted) like drift', async () => {
    const { svc, entry } = await review();
    tabs.clear();
    expect((await svc.approve(entry.approvalId)).outcome).toBe('form_changed');
    expect(submitRuns).toBe(0);
  });

  it('a revoked grant stops approval before anything changes', async () => {
    const { svc, entry } = await review();
    prepare = async () => {
      throw new Error('You have not allowed this');
    };
    await expect(svc.approve(entry.approvalId)).rejects.toThrow(/not allowed/);
    expect(approval()[0]!.status).toBe('pending');
    expect(rows().at(-1)!.status).toBe('awaiting_approval');
    expect(submitRuns).toBe(0);
  });

  it('a submit run that never clicked reports that nothing was sent', async () => {
    submitBehaviour = async () => ({ ...base, status: 'failed' });
    const { svc, id, entry } = await review();
    await svc.approve(entry.approvalId);
    await settle(() => rows().at(-1)?.status === 'failed');
    expect(rows().at(-1)!.error).toMatch(/Nothing was sent/);
    expect(approval()[0]).toMatchObject({ status: 'expired', claimed: null });
    expect(applied(id).at).toBeNull();
  });

  it('a click the page did not confirm is a failure with a warning, never an Applied', async () => {
    submitBehaviour = async (a) => {
      a.claim();
      return { ...base, status: 'failed' };
    };
    const { svc, id, entry } = await review();
    await svc.approve(entry.approvalId);
    await settle(() => rows().at(-1)?.status === 'failed');
    expect(rows().at(-1)!.error).toMatch(/clicked but the page did not confirm/);
    expect(applied(id).at).toBeNull();
  });

  it('a crash mid-submit is settled at startup by the durable claim, never resumed', async () => {
    const { svc, entry } = await review();
    await svc.stop();
    sqlite.prepare("UPDATE approval SET status = 'approved' WHERE id = ?").run(entry.approvalId);
    const relaunched = service();
    await relaunched.initialize();
    expect(rows().at(-1)).toMatchObject({ status: 'failed', error: expect.stringMatching(/Nothing was sent/) });
    expect(submitRuns).toBe(0);

    const second = await review();
    await second.svc.stop();
    sqlite
      .prepare("UPDATE approval SET status = 'approved', submit_claimed_at = 1 WHERE id = ?")
      .run(second.entry.approvalId);
    await service().initialize();
    expect(rows().at(-1)!.error).toMatch(/clicked but the page did not confirm/);
    expect(submitRuns).toBe(0);
  });
});

describe('reject', () => {
  it('cancels the run, rejects the approval, closes the tab, and is not repeatable', async () => {
    const { svc, entry } = await review();
    expect((await svc.reject(entry.approvalId)).status).toBe('cancelled');
    expect(approval()[0]!.status).toBe('rejected');
    expect(tabs.size).toBe(0);
    await expect(svc.reject(entry.approvalId)).rejects.toThrow(/already decided/);
    expect((await svc.approve(entry.approvalId)).outcome).toBe('already_decided');
    expect(submitRuns).toBe(0);
  });
});

describe('answering what a run asked', () => {
  const asks = async () => {
    fillResult = {
      ...base,
      status: 'needs_answers',
      questions_needed: [
        { field_key: 'why', question: 'Why Acme?' },
        { field_key: 'start', question: 'Start date?', options: ['Now', 'In a month'] },
      ],
    };
    const svc = service();
    await svc.initialize();
    const id = application();
    await svc.start(id);
    await settle(() => rows().at(-1)?.status === 'needs_you');
    const item = svc.listInbox()[0];
    if (item?.kind !== 'needs_you') throw new Error('expected a needs_you item');
    return { svc, id, item };
  };

  it('lists the questions, validates the answers against them, then fills again with the owner answers', async () => {
    const { svc, id, item } = await asks();
    expect(item.questions.map((q) => q.fieldKey)).toEqual(['why', 'start']);
    const answer = (...a: Array<[string, string]>) =>
      svc.answer({ runId: item.runId, answers: a.map(([fieldKey, text]) => ({ fieldKey, answer: text })) });
    await expect(answer(['nope', 'x'])).rejects.toThrow(/does not match/);
    await expect(answer(['why', 'x'])).rejects.toThrow(/Answer every question/);
    await expect(answer(['why', 'x'], ['start', 'Tomorrow'])).rejects.toThrow(/offered options/);
    await expect(answer(['why', 'x'], ['why', 'y'], ['start', 'Now'])).rejects.toThrow(/does not match/);
    expect(rows()).toHaveLength(1);
    fillResult = filled;
    const next = await answer(['why', 'Because of the mission.'], ['start', 'Now']);
    expect(next.status).not.toBe('needs_you');
    const plan = new PostingService(db, { info() {}, warn() {}, error() {}, debug() {} } as never).resolveFillPlan(id);
    expect(plan.entries.find((e) => e.field_key === 'why')).toMatchObject({
      value: 'Because of the mission.',
      source: 'owner',
    });
    expect(plan.entries.find((e) => e.field_key === 'start')).toMatchObject({ value: 'Now', source: 'owner' });
    expect(rows()[0]!.status).toBe('failed');
    // Answering again with the old run is a no-op error, not a second run.
    await expect(answer(['why', 'z'], ['start', 'Now'])).rejects.toThrow(/no longer waiting/);
    expect(rows()).toHaveLength(2);
  });

  it('a revoked grant stops the answer before it is stored', async () => {
    const { svc, item } = await asks();
    prepare = async () => {
      throw new Error('You have not allowed this');
    };
    await expect(
      svc.answer({
        runId: item.runId,
        answers: [
          { fieldKey: 'why', answer: 'x' },
          { fieldKey: 'start', answer: 'Now' },
        ],
      }),
    ).rejects.toThrow(/not allowed/);
    expect(sqlite.prepare('SELECT count(*) AS n FROM application_answer').get()).toEqual({ n: 0 });
  });

  describe('owner take-over (#243)', () => {
    it('names the tab by host only and refuses when there is no open tab', async () => {
      const { svc, entry } = await review();
      expect(await svc.goToTab(entry.runId)).toEqual({ tabId: `tab-${entry.runId}`, host: 'careers.example.org' });
      tabs.clear();
      await expect(svc.goToTab(entry.runId)).rejects.toThrow(/no open tab/);
    });

    it('blocks approve while the owner holds the tab, never submits, and resumes after hand back', async () => {
      const { svc, entry } = await review();
      expect(entry.takenOver).toBe(false);
      svc.takeOver(entry.runId);
      const held = svc.listInbox().find((item) => item.kind === 'approval');
      expect(held?.takenOver).toBe(true);
      await expect(svc.approve(entry.approvalId)).rejects.toThrow(/Hand it back/);
      expect(submitRuns).toBe(0);
      expect(rows().at(-1)!.status).toBe('awaiting_approval');
      svc.handBack(entry.runId);
      svc.handBack(entry.runId); // idempotent
      expect(svc.listInbox().find((item) => item.kind === 'approval')?.takenOver).toBe(false);
      expect((await svc.approve(entry.approvalId)).outcome).toBe('submitting');
      expect(vi.mocked(AuditService.record).mock.calls.map(([event]) => event.type)).toEqual(
        expect.arrayContaining(['takeover_started', 'takeover_ended']),
      );
    });

    it('only a run with an open tab can be taken over', async () => {
      const { svc, entry } = await review();
      tabs.clear();
      expect(() => svc.takeOver(entry.runId)).toThrow(/no open tab/);
    });
  });
});
