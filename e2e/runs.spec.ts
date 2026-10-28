import { skipOnboarding } from './onboarding';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Main = typeof import('../src/main/app/main');

async function inspect(app: ElectronApplication) {
  return app.evaluate(async ({ app }) => {
    // Inspector evaluates can interrupt main-process JS mid-query; wait for an idle tick before using the DB.
    await new Promise((resolve) => setImmediate(resolve));
    const path = process.getBuiltinModule('node:path')!;
    const require = process.getBuiltinModule('node:module')!.createRequire(path.join(app.getAppPath(), 'package.json'));
    const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
    return {
      tabs: [...main.fakeBrowser!.tabs.keys()],
      aborted: [...main.fakeAgent!.aborted],
      history: [...main.fakeAgent!.history],
      runs: main.db.$client
        .prepare('SELECT id, application_id, status, attempt, session_id, form_hash, error, result, tab_id FROM run')
        .all(),
      approvals: main.db.$client.prepare('SELECT run_id, application_id, form_hash FROM approval').all(),
      events: main.db.$client
        .prepare(
          "SELECT run_id, from_status, to_status, data FROM application_event WHERE type = 'run_transition' ORDER BY rowid",
        )
        .all(),
    };
  });
}

async function complete(app: ElectronApplication, ids: string[], status = 'filled') {
  await app.evaluate(
    ({ app }, { ids, status }) => {
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      for (const id of ids)
        main.fakeAgent!.complete(id, {
          status,
          answers_used: [],
          answers_added: [],
          learned: [],
          blockers: [],
          form_hash: `fake-${id}`,
        });
    },
    { ids, status },
  );
}

// eslint-disable-next-line no-empty-pattern
test('apply queue limits concurrency, pauses, cancels, validates results, and recovers after a crash', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-runs-'));
  const packaged = testInfo.project.name === 'packaged';
  const options = {
    ...(packaged
      ? {
          executablePath:
            process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot',
        }
      : {}),
    args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
    env: { ...process.env, JOBPILOT_E2E_PROVIDER: 'fake' },
    timeout: 60_000,
  };
  let app: ElectronApplication | undefined;
  try {
    app = await electron.launch(options);
    const window = await app.firstWindow();
    await skipOnboarding(window);
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    const applicationIds = await app.evaluate(async ({ app }) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      main.fakeAgent!.delayMs = 60_000;
      // Seed only fixtures; start/cancel/list all go through the real sandboxed preload and IPC.
      const db = main.db.$client;
      const id = (n: number) => String(n).padStart(26, '0');
      db.prepare('INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        id(0),
        'Fake employer',
        'fake-employer',
        1,
        1,
      );
      for (let i = 1; i <= 16; i++) {
        db.prepare(
          'INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          id(i),
          id(0),
          `https://example.invalid/jobs/${i}`,
          `https://example.invalid/jobs/${i}`,
          'custom',
          `Fake job ${i}`,
          1,
          1,
        );
        db.prepare(
          'INSERT INTO application (id, posting_id, status, queue_rank, last_activity_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(id(i + 100), id(i), 'queued', i, 1, 1, 1);
      }
      return Array.from({ length: 16 }, (_, i) => id(i + 101));
    });
    expect(await window.evaluate(() => window.jobpilot!.runs.pause())).toBe(true);
    const first = await window.evaluate(
      async (ids) => Promise.all(ids.map((id) => window.jobpilot!.runs.start(id))),
      applicationIds.slice(0, 7),
    );
    expect(first.every((run) => run.status === 'queued')).toBe(true);
    const duplicate = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[0]!);
    expect(duplicate.id).toBe(first[0]!.id);
    expect((await inspect(app)).tabs).toEqual([]);
    expect(await window.evaluate(() => window.jobpilot!.runs.resume())).toBe(false);
    await expect
      .poll(
        async () =>
          (await window.evaluate(() => window.jobpilot!.runs.list())).filter((row) => row.status === 'running').length,
      )
      .toBe(6);
    expect(
      (await window.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === first[6]!.id)?.status,
    ).toBe('queued');
    await expect.poll(async () => (await inspect(app!)).tabs.length).toBe(6);
    await window.evaluate(() => window.jobpilot!.runs.pause());
    await complete(
      app,
      first.slice(0, 6).map((row) => row.id),
    );
    await expect
      .poll(
        async () =>
          (await window.evaluate(() => window.jobpilot!.runs.list())).filter(
            (row) => row.status === 'awaiting_approval',
          ).length,
      )
      .toBe(6);
    const inspectedApprovals = await inspect(app);
    for (const row of first.slice(0, 6)) {
      const approval = (inspectedApprovals.approvals as Array<{ run_id: string; form_hash: string }>).find(
        (a) => a.run_id === row.id,
      );
      expect(approval).toBeDefined();
      const expectedFormHash = createHash('sha256').update(`fake-form-${row.id}`).digest('hex');
      expect(approval!.form_hash).toBe(expectedFormHash);
      expect(approval!.form_hash).not.toBe(`fake-${row.id}`);
    }
    expect(
      (await window.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === first[6]!.id)?.status,
    ).toBe('queued');
    await window.evaluate(() => window.jobpilot!.runs.resume());
    await expect.poll(async () => (await inspect(app!)).tabs.includes(first[6]!.id)).toBe(true);
    expect(await window.evaluate((id) => window.jobpilot!.runs.cancel(id), first[6]!.id)).toMatchObject({
      status: 'cancelled',
    });
    expect(await window.evaluate((id) => window.jobpilot!.runs.cancel(id), first[6]!.id)).toMatchObject({
      status: 'cancelled',
    });
    await expect.poll(async () => (await inspect(app!)).aborted).toContain(first[6]!.id);
    expect((await inspect(app)).tabs).not.toContain(first[6]!.id);

    const invalid = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[7]!);
    await expect.poll(async () => (await inspect(app!)).tabs.includes(invalid.id)).toBe(true);
    await complete(app, [invalid.id], 'invalid-result');
    await expect
      .poll(
        async () =>
          (await window.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === invalid.id)?.status,
      )
      .toBe('failed');
    expect((await inspect(app)).tabs).not.toContain(invalid.id);

    // Audit insertion failure must roll the run transition back in the same transaction.
    await app.evaluate(async ({ app }) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { db } = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      db.$client.exec(
        "CREATE TRIGGER reject_run_audit BEFORE INSERT ON application_event WHEN NEW.type = 'run_transition' BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END",
      );
    });
    expect(
      await window.evaluate(async (id) => {
        try {
          await window.jobpilot!.runs.start(id);
          return false;
        } catch {
          return true;
        }
      }, applicationIds[8]!),
    ).toBe(true);
    expect(
      (await window.evaluate(() => window.jobpilot!.runs.list())).filter(
        (row) => row.applicationId === applicationIds[8]!,
      ),
    ).toEqual([]);
    await app.evaluate(async ({ app }) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      (require(path.join(app.getAppPath(), 'out/main/index.js')) as Main).db.$client.exec(
        'DROP TRIGGER reject_run_audit',
      );
    });

    // Run encountering missing answers transitions to needs_you, saving sessionId for tracing only.
    const needsAnswersRun = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[9]!);
    await expect.poll(async () => (await inspect(app!)).tabs.includes(needsAnswersRun.id)).toBe(true);
    await complete(app, [needsAnswersRun.id], 'needs_answers');
    await expect
      .poll(
        async () =>
          (await window.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === needsAnswersRun.id)
            ?.status,
      )
      .toBe('needs_you');
    const stateAfterNeedsYou = await inspect(app);
    const run1 = (stateAfterNeedsYou.runs as Array<{ id: string; attempt: number; session_id: string | null }>).find(
      (r) => r.id === needsAnswersRun.id,
    );
    expect(run1).toMatchObject({ attempt: 1, session_id: `session-${needsAnswersRun.id}` });

    // A retry after needs_you starts fresh: attempt 2, no sessionId carry-over / resume, and completes to awaiting_approval.
    const retry = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[9]!);
    expect(retry.id).not.toBe(needsAnswersRun.id);
    const retryState = await inspect(app);
    const retryRow = (retryState.runs as Array<{ id: string; attempt: number; session_id: string | null }>).find(
      (r) => r.id === retry.id,
    );
    expect(retryRow).toBeDefined();
    expect(retryRow!.attempt).toBe(2);
    expect(retryRow!.session_id).not.toBe(`session-${needsAnswersRun.id}`);
    await expect.poll(async () => (await inspect(app!)).tabs.includes(retry.id)).toBe(true);
    await complete(app, [retry.id], 'filled');
    await expect
      .poll(
        async () =>
          (await window.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === retry.id)?.status,
      )
      .toBe('awaiting_approval');
    const retryApproval = ((await inspect(app)).approvals as Array<{ run_id: string; form_hash: string }>).find(
      (a) => a.run_id === retry.id,
    );
    expect(retryApproval?.form_hash).toBe(createHash('sha256').update(`fake-form-${retry.id}`).digest('hex'));

    for (const status of ['blocked', 'submitted']) {
      const next = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[9]!);
      await expect.poll(async () => (await inspect(app!)).tabs.includes(next.id)).toBe(true);
      await complete(app, [next.id], status);
      await expect
        .poll(
          async () =>
            (await window.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === next.id)?.status,
        )
        .toBe(status === 'submitted' ? 'failed' : 'needs_you');
    }

    const interrupted = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[10]!);
    await expect.poll(async () => (await inspect(app!)).tabs.includes(interrupted.id)).toBe(true);
    await window.evaluate(() => window.jobpilot!.runs.pause());
    const queued = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[11]!);
    const before = await inspect(app);
    for (const row of first.slice(0, 6)) {
      expect(before.events.filter((event) => (event as { run_id: string }).run_id === row.id)).toMatchObject([
        { from_status: null, to_status: 'queued' },
        { from_status: 'queued', to_status: 'running' },
        { from_status: 'running', to_status: 'awaiting_approval' },
      ]);
    }
    expect(before.runs.find((row) => (row as { id: string }).id === invalid.id)).toMatchObject({ result: null });
    // SIGKILL bypasses graceful cleanup and leaves a genuine running row.
    const child = app.process();
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child.kill('SIGKILL');
    await exited;
    app = undefined;
    app = await electron.launch(options);
    const restarted = await app.firstWindow();
    await skipOnboarding(restarted);
    await expect(restarted.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect
      .poll(
        async () =>
          (await restarted.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === queued.id)?.status,
      )
      .toBe('awaiting_approval');
    const recovered = await inspect(app);
    // The interrupted run is requeued and resumed (ADR 0017): same row, second attempt.
    await expect
      .poll(
        async () =>
          (await restarted.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === interrupted.id)
            ?.status,
      )
      .toBe('awaiting_approval');
    expect(recovered.events).toContainEqual(
      expect.objectContaining({
        run_id: interrupted.id,
        from_status: 'running',
        to_status: 'queued',
        data: JSON.stringify({ reason: 'app restarted' }),
      }),
    );
    // Starting again returns the active run instead of creating a second one.
    const replacement = await restarted.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[10]!);
    expect(replacement.id).toBe(interrupted.id);
    await expect
      .poll(
        async () =>
          (await restarted.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === replacement.id)
            ?.status,
      )
      .toBe('awaiting_approval');
    await restarted.evaluate(() => window.jobpilot!.runs.pause());
    const limited = await restarted.evaluate(
      async (ids) => Promise.all(ids.map((id) => window.jobpilot!.runs.start(id))),
      applicationIds.slice(12, 15),
    );
    await app.evaluate(async ({ app }) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { db } = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      db.$client
        .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
        .run('runs.concurrency', '1', Date.now());
    });
    await app.close();
    app = await electron.launch(options);
    const configured = await app.firstWindow();
    await skipOnboarding(configured);
    await expect(configured.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect
      .poll(async () =>
        (await configured.evaluate(() => window.jobpilot!.runs.list()))
          .filter((row) => limited.some((item) => item.id === row.id))
          .map((row) => row.status)
          .sort(),
      )
      .toEqual(['queued', 'queued', 'running']);
    await expect
      .poll(
        async () =>
          (await configured.evaluate(() => window.jobpilot!.runs.list())).filter(
            (row) => limited.some((item) => item.id === row.id) && row.status === 'awaiting_approval',
          ).length,
      )
      .toBe(3);
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
