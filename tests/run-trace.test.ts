import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ userData: '', key: undefined as Buffer | undefined }));
vi.mock('electron', () => ({
  app: { getPath: () => state.userData, getAppPath: () => process.cwd(), isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] },
}));

vi.mock('../src/main/platform/secrets/db-key', () => ({
  getDatabaseKey: (create = false) => {
    if (state.key) return Promise.resolve({ key: Buffer.from(state.key), created: false });
    if (!create) return Promise.reject(new Error('missing key'));
    state.key = Buffer.alloc(32, 7);
    return Promise.resolve({ key: Buffer.from(state.key), created: true });
  },
  storeDatabaseKey: (key: Buffer) => {
    state.key = Buffer.from(key);
    return Promise.resolve();
  },
}));

vi.mock('../src/main/modules/observability/log.service', () => ({
  loggerFor: () => ({ error: vi.fn() }),
}));

import { closeDatabase, db, openDatabase } from '../src/main/platform/db/database';
import { run } from '../src/main/modules/runs/runs.entity';
import { PostingsRepository } from '../src/main/modules/postings/postings.repository';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import {
  DEFAULT_RETENTION_MS,
  deriveTranscriptKey,
  RunTraceService,
  setTranscriptKey,
} from '../src/main/modules/observability/observability.service';

const testKey = Buffer.alloc(32, 7);
const logger = { error: vi.fn() };
const traceDir = () => join(state.userData, 'logs', 'runs');
const traceFile = (runId: string) => join(traceDir(), `${runId}.jsonl`);

let runCounter = 0;
function seedRun(runId: string) {
  const postings = new PostingsRepository(db);
  const postingId = postings.ingest({
    company: 'Acme',
    title: `Role ${runCounter++}`,
    canonical_url: `https://example.com/jobs/${runId}`,
    ats: 'custom',
    questions: [],
    verified: true,
    source: 'fetch',
    location: null,
    salary: null,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    description: null,
    ats_tenant: null,
    ats_job_id: null,
  });
  const appId = new ApplicationsService(db).create(postingId).id;
  db.insert(run)
    .values({
      id: runId,
      applicationId: appId,
      agent: 'claude',
      browser: 'neo',
      status: 'running',
    })
    .onConflictDoNothing()
    .run();
}

beforeAll(async () => {
  state.userData = mkdtempSync(join(tmpdir(), 'jobpilot-trace-test-'));
  state.key = undefined;
  setTranscriptKey(testKey);
  await openDatabase(logger);
});

afterAll(() => {
  try {
    closeDatabase();
  } catch {
    // Ignore
  }
  if (state.userData) rmSync(state.userData, { recursive: true, force: true });
});

const lines = (runId: string) => readFileSync(traceFile(runId), 'utf8').split('\n').filter(Boolean);
const append = (runId: string, payload: Record<string, string | number>) =>
  RunTraceService.append({ runId, type: 'message', payload });

describe('RunTraceService (#200 encrypted run transcripts)', () => {
  it('writes one sealed v1 record per event and round-trips', () => {
    const runId = '01JBCDEFGHJKMNPQRSTVWXYZ01';
    seedRun(runId);
    append(runId, { text: 'Hello owner' });
    expect(lines(runId)).toHaveLength(1);
    append(runId, { text: 'second' });
    expect(lines(runId)).toHaveLength(2);
    const raw = readFileSync(traceFile(runId), 'utf8');
    expect(lines(runId).every((line) => line.startsWith('v1.'))).toBe(true);
    expect(raw).not.toContain('Hello owner');
    expect(RunTraceService.read(runId).map((event) => event.payload)).toEqual([
      { text: 'Hello owner' },
      { text: 'second' },
    ]);
  });

  it('skips and counts a tampered line without losing the others', () => {
    const runId = '01JBCDEFGHJKMNPQRSTVWXYZ02';
    seedRun(runId);
    for (const text of ['a', 'b', 'c']) append(runId, { text });
    const all = lines(runId);
    const flipped = Buffer.from(all[1]!.slice(3), 'base64');
    flipped[flipped.length - 1] = (flipped[flipped.length - 1] ?? 0) ^ 0x55;
    writeFileSync(traceFile(runId), `${all[0]}\nv1.${flipped.toString('base64')}\n${all[2]}\n`);
    const trace = RunTraceService.readTrace(runId);
    expect(trace.skipped).toBe(1);
    expect(trace.lines.map((line) => (JSON.parse(line) as { payload: { text: string } }).payload.text)).toEqual([
      'a',
      'c',
    ]);
  });

  it('binds a record to its run (AAD): a line copied to another run is rejected', () => {
    const a = '01JBCDEFGHJKMNPQRSTVWXYZ03';
    const b = '01JBCDEFGHJKMNPQRSTVWXYZ04';
    seedRun(a);
    seedRun(b);
    append(a, { text: 'x' });
    writeFileSync(traceFile(b), `${lines(a)[0]}\n`);
    expect(RunTraceService.readTrace(b)).toEqual({ lines: [], skipped: 1 });
  });

  it('survives a torn final line: the next append is still readable', () => {
    const runId = '01JBCDEFGHJKMNPQRSTVWXYZ05';
    seedRun(runId);
    append(runId, { text: 'before' });
    writeFileSync(traceFile(runId), `${readFileSync(traceFile(runId), 'utf8')}\nv1.AAAA`);
    append(runId, { text: 'after' });
    const trace = RunTraceService.readTrace(runId);
    expect(trace.skipped).toBe(1);
    expect(trace.lines).toHaveLength(2);
  });

  it('derives a transcript subkey that differs from the database key', () => {
    const subkey = deriveTranscriptKey(testKey);
    expect(subkey).toHaveLength(32);
    expect(subkey.equals(testKey)).toBe(false);
    expect(deriveTranscriptKey(testKey).equals(subkey)).toBe(true);
  });

  it('migrates legacy plaintext at init with an atomic rename and no leftovers', async () => {
    const runId = '01JBCDEFGHJKMNPQRSTVWXYZ06';
    mkdirSync(traceDir(), { recursive: true });
    writeFileSync(
      traceFile(runId),
      `${JSON.stringify({ seq: 1, runId, type: 'message', payload: { text: 'Legacy' } })}\n`,
    );
    expect(RunTraceService.read(runId)).toHaveLength(1); // readable before migration
    await RunTraceService.init(() => Promise.resolve(Buffer.from(testKey)));
    const raw = readFileSync(traceFile(runId), 'utf8');
    expect(raw).not.toContain('Legacy');
    expect(raw.startsWith('v1.')).toBe(true);
    expect(readdirSync(traceDir()).filter((name) => name.endsWith('.tmp'))).toEqual([]);
    expect(RunTraceService.read(runId)[0]).toMatchObject({ payload: { text: 'Legacy' } });
  });

  it('never writes plaintext or throws when the key is unavailable', () => {
    const runId = '01JBCDEFGHJKMNPQRSTVWXYZ07';
    seedRun(runId);
    setTranscriptKey(null);
    try {
      expect(() => append(runId, { text: 'Top secret profile' })).not.toThrow();
      const raw = readFileSync(traceFile(runId), 'utf8');
      expect(raw).not.toContain('Top secret profile');
      expect(JSON.parse(raw.trim())).toMatchObject({ runId, seq: 1, type: 'message' });
      expect(JSON.parse(raw.trim())).not.toHaveProperty('payload');
    } finally {
      setTranscriptKey(testKey);
    }
  });

  it('prunes old transcripts and keeps new ones', () => {
    const oldRun = '01JBCDEFGHJKMNPQRSTVWXYZ08';
    const newRun = '01JBCDEFGHJKMNPQRSTVWXYZ09';
    seedRun(oldRun);
    seedRun(newRun);
    append(oldRun, { n: 1 });
    append(newRun, { n: 1 });
    const old = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    utimesSync(traceFile(oldRun), old, old);
    const result = RunTraceService.prune(DEFAULT_RETENTION_MS);
    expect(result.deleted).toContain(`${oldRun}.jsonl`);
    expect(result.kept).toContain(`${newRun}.jsonl`);
    expect(existsSync(traceFile(oldRun))).toBe(false);
    expect(existsSync(traceFile(newRun))).toBe(true);
  });

  it('clear removes every transcript', () => {
    const runId = '01JBCDEFGHJKMNPQRSTVWXYZ10';
    seedRun(runId);
    append(runId, { n: 1 });
    RunTraceService.clear();
    expect(existsSync(traceFile(runId))).toBe(false);
  });
});
