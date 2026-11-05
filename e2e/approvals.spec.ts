import { allowFakeConnections, skipOnboarding } from './onboarding';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Main = typeof import('../src/main/app/main');

const BASE_RESULT = { answers_used: [], answers_added: [], learned: [], blockers: [] };

/** Runs `fn` in the main process with the fake providers and the database. */
function inMain<T, A>(
  app: ElectronApplication,
  fn: (main: Main, arg: A) => T | Promise<T>,
  arg: A,
): Promise<Awaited<T>> {
  return app.evaluate(
    async ({ app }, { source, arg }) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      return (0, eval)(`(${source})`)(main, arg);
    },
    { source: fn.toString(), arg },
  );
}

const id = (n: number) => String(n).padStart(26, '0');

async function seed(app: ElectronApplication, count: number) {
  await inMain(
    app,
    (main, n) => {
      const db = main.db.$client;
      const pad = (k: number) => String(k).padStart(26, '0');
      db.prepare('INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        pad(0),
        'Fake employer',
        'fake-employer',
        1,
        1,
      );
      for (let i = 1; i <= n; i++) {
        db.prepare(
          'INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
        ).run(
          pad(i),
          pad(0),
          `https://example.invalid/jobs/${i}`,
          `https://example.invalid/jobs/${i}`,
          'custom',
          `Fake job ${i}`,
          1,
          1,
        );
        db.prepare(
          'INSERT INTO application (id, posting_id, status, queue_rank, last_activity_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(pad(i + 100), pad(i), 'queued', i, 1, 1, 1);
      }
      main.fakeAgent!.delayMs = 60_000;
    },
    count,
  );
}

/** Starts the application's run and finishes the fill with `result`; returns the run id. */
async function fill(app: ElectronApplication, window: Page, applicationId: string, result: object) {
  const run = await window.evaluate((appId) => window.jobpilot!.runs.start(appId), applicationId);
  await expect
    .poll(() => inMain(app, (main, runId) => main.fakeAgent!.history.some((h) => h.runId === runId), run.id))
    .toBe(true);
  await inMain(app, (main, arg) => main.fakeAgent!.complete(arg.runId, arg.result), { runId: run.id, result });
  return run.id;
}

const rows = (app: ElectronApplication, sql: string) =>
  inMain(app, (main, query) => main.db.$client.prepare(query).all() as Array<Record<string, unknown>>, sql);

// eslint-disable-next-line no-empty-pattern
test('fill, review, approve and submit; drift, needs-you answers, double approve and a revoked grant fail safely', async ({}, testInfo) => {
  test.setTimeout(180_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-approvals-'));
  const packaged = testInfo.project.name === 'packaged';
  let app: ElectronApplication | undefined;
  try {
    app = await electron.launch({
      ...(packaged
        ? {
            executablePath:
              process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot',
          }
        : {}),
      args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
      env: { ...process.env, JOBPILOT_E2E_PROVIDER: 'fake' },
      timeout: 60_000,
    });
    const window = await app.firstWindow();
    await window.setViewportSize({ width: 1280, height: 800 });
    await skipOnboarding(window);
    await allowFakeConnections(window);
    await seed(app, 7);
    await window.getByRole('link', { name: 'Inbox' }).click();
    await expect(window.getByRole('status')).toContainText('Nothing needs you');

    // 1. Happy path: review shows what will be sent; approve needs a second, explicit confirmation.
    const run1 = await fill(app, window, id(101), { ...BASE_RESULT, status: 'filled' });
    await expect(window.getByRole('log')).toContainText('The form is filled with 2 fields');
    await expect(window.getByRole('complementary', { name: 'Details' })).toContainText('What will be sent · 2');
    await expect(window.getByRole('complementary', { name: 'Details' })).toContainText('Sara Benali');
    for (const theme of ['light', 'dark'] as const) {
      await window.evaluate((source) => window.jobpilot!.theme.set(source), theme);
      await window.screenshot({ path: testInfo.outputPath(`inbox-review-${theme}.png`), animations: 'disabled' });
    }
    await window.evaluate((source) => window.jobpilot!.theme.set(source), 'light');
    // Messaging (#242, #243, #255): the owner's message shows at once, the reply streams word by word, Esc stops it.
    await inMain(
      app,
      (main, appId) => {
        main.fakeAgent!.delayMs = 3000; // a slow model: six words over three seconds; runs get their 60 s hold back below
        main.fakeAgent!.streamReply = (spec) =>
          spec.prompt.includes('<jobs>')
            ? 'Cap: passing that on now.'
            : spec.prompt.includes('mention Rust')
              ? 'Rust: noted for the next fill.'
              : 'Agent: noted for the next fill.';
        main.fakeAgent!.reply = (spec) =>
          spec.prompt.includes('<jobs>') ? { relays: [{ applicationId: appId, note: 'keep it short' }] } : undefined;
      },
      id(101),
    );
    const log = window.getByRole('log');
    const field = window.getByLabel('Message this agent');
    await field.fill('Please use my short bio');
    await field.press('Enter');
    // Instant feedback: the message and the typing indicator are there long before the first token.
    await expect(log).toContainText('Please use my short bio', { timeout: 400 });
    await expect(field).toHaveValue('');
    await expect(window.getByRole('status', { name: 'The agent is replying' })).toBeVisible({ timeout: 400 });
    await expect(window.getByRole('button', { name: 'Stop reply' })).toBeVisible();
    await expect(log).toContainText('Agent:'); // the first words arrive...
    await expect(log).not.toContainText('next fill.'); // ...while the rest is still being written
    await expect(log).toContainText('Agent: noted for the next fill.');
    await expect(window.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
    // Esc stops a reply in flight and keeps what was already written.
    await field.fill('And mention Rust');
    await field.press('Enter');
    await expect(log).toContainText('Rust:'); // the first words of the second reply are on screen
    await field.press('Escape');
    await expect(window.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
    await expect(log).not.toContainText('Rust: noted for the next fill.');
    expect(await rows(app, 'SELECT sender, body FROM inbox_message ORDER BY created_at, id')).toEqual([
      { sender: 'owner', body: 'Please use my short bio' },
      { sender: 'agent', body: 'Agent: noted for the next fill.' },
      { sender: 'owner', body: 'And mention Rust' },
      { sender: 'agent', body: 'Rust:' }, // the partial text, not the whole reply
    ]);
    await inMain(app, (main) => void (main.fakeAgent!.delayMs = 0), 0); // Cap answers at once
    await window.getByText('Ask me anything about your jobs').click();
    await window.getByLabel('Message Cap').fill('Tell the Fake employer agent to keep it short');
    await window.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(window.getByRole('log')).toContainText('Cap: passing that on now.');
    await expect(window.getByRole('log')).toContainText('Passed to');
    expect(await rows(app, "SELECT sender, body FROM inbox_message WHERE body LIKE 'Via Cap%'")).toEqual([
      { sender: 'owner', body: 'Via Cap: keep it short' },
    ]);
    await window
      .getByRole('button', { name: /Review/ })
      .first()
      .click();
    await expect(window.getByLabel('Message this agent')).toBeVisible();
    await inMain(app, (main) => void (main.fakeAgent!.delayMs = 60_000), 0);
    expect(await rows(app, 'SELECT status FROM approval')).toEqual([{ status: 'pending' }]);

    // Take over: Go to tab names the tab, Take over pauses the agent and blocks approving until Hand back. Nothing is sent.
    const reviewPanel = window.getByRole('complementary', { name: 'Details' });
    await window.getByRole('button', { name: 'Go to tab' }).click();
    await expect(window.getByRole('status').filter({ hasText: 'example.com' })).toBeVisible();
    await window.getByRole('button', { name: 'Take over' }).click();
    await expect(window.getByText('You have the tab. The agent is paused.')).toBeVisible();
    await expect(reviewPanel.getByRole('button', { name: 'Approve and send' })).toBeDisabled();
    expect(await rows(app, 'SELECT status FROM approval')).toEqual([{ status: 'pending' }]);
    await window.getByRole('button', { name: 'Hand back' }).click();
    await expect(reviewPanel.getByRole('button', { name: 'Approve and send' })).toBeEnabled();
    expect(await rows(app, 'SELECT status FROM approval')).toEqual([{ status: 'pending' }]);
    await window
      .getByRole('complementary', { name: 'Details' })
      .getByRole('button', { name: 'Approve and send' })
      .click();
    expect(await rows(app, 'SELECT status FROM approval')).toEqual([{ status: 'pending' }]);
    await window
      .getByRole('complementary', { name: 'Details' })
      .getByRole('button', { name: 'Yes, send to Fake employer' })
      .click();
    await expect.poll(async () => (await rows(app!, 'SELECT status FROM approval'))[0]?.status).toBe('approved');
    await expect
      .poll(() =>
        inMain(app!, (main) => main.fakeAgent!.history.some((h) => h.prompt.includes('The owner approved')), 0),
      )
      .toBe(true);
    expect(await inMain(app, (main, runId) => main.fakeBrowser!.clickSubmit(runId), run1)).toBe('clicked');
    expect(await inMain(app, (main, runId) => main.fakeBrowser!.clickSubmit(runId), run1)).toBe('refused');
    await inMain(
      app,
      (main, runId) =>
        main.fakeAgent!.complete(runId, {
          status: 'submitted',
          answers_used: [],
          answers_added: [],
          learned: [],
          blockers: [],
        }),
      run1,
    );
    await expect(window.getByRole('status')).toContainText('Nothing needs you');
    expect(
      await rows(app, `SELECT status, applied_at IS NOT NULL AS applied FROM application WHERE id = '${id(101)}'`),
    ).toEqual([{ status: 'applied', applied: 1 }]);
    expect(await rows(app, "SELECT status FROM run WHERE status = 'submitted'")).toHaveLength(1);

    // 2. Form drift between review and approve: nothing is sent, a new review is produced.
    const run2 = await fill(app, window, id(102), { ...BASE_RESULT, status: 'filled' });
    await expect(
      window.getByRole('complementary', { name: 'Details' }).getByRole('button', { name: 'Approve and send' }),
    ).toBeVisible();
    await inMain(app, (main, runId) => main.fakeBrowser!.drift.set(runId, 1), run2);
    await window
      .getByRole('complementary', { name: 'Details' })
      .getByRole('button', { name: 'Approve and send' })
      .click();
    await window
      .getByRole('complementary', { name: 'Details' })
      .getByRole('button', { name: /^Yes, send to/ })
      .click();
    await expect(window.getByRole('alert')).toContainText('The page changed after you reviewed it');
    expect(await rows(app, `SELECT status FROM run WHERE id = '${run2}'`)).toEqual([{ status: 'failed' }]);
    expect(await rows(app, `SELECT status FROM approval WHERE run_id = '${run2}'`)).toEqual([{ status: 'expired' }]);
    expect(
      await inMain(
        app,
        (main) => main.fakeAgent!.history.filter((h) => h.prompt.includes('The owner approved')).length,
        0,
      ),
    ).toBe(1);
    expect(await rows(app, `SELECT applied_at FROM application WHERE id = '${id(102)}'`)).toEqual([
      { applied_at: null },
    ]);
    // The stale approval id can no longer be used, even through the bridge.
    const stale = (await rows(app, `SELECT id FROM approval WHERE run_id = '${run2}'`))[0]!.id as string;
    expect((await window.evaluate((approvalId) => window.jobpilot!.inbox.approve(approvalId), stale)).outcome).toBe(
      'already_decided',
    );

    // 3. Needs-you: answer a question in the Inbox and the application is filled again with it.
    await fill(app, window, id(103), {
      ...BASE_RESULT,
      status: 'needs_answers',
      questions_needed: [{ field_key: 'why', question: 'Why this role?' }],
    });
    await window.getByLabel('Why this role?').fill('Because the mission fits my background.');
    await window.getByRole('button', { name: 'Save and fill again' }).click();
    await expect
      .poll(async () =>
        (await rows(app!, `SELECT status FROM run WHERE application_id = '${id(103)}' ORDER BY created_at`)).map(
          (r) => r.status,
        ),
      )
      .toEqual(['failed', expect.stringMatching(/queued|running/)]);
    expect(await rows(app, "SELECT answer, source FROM application_answer WHERE field_key = 'why'")).toEqual([
      { answer: 'Because the mission fits my background.', source: 'owner' },
    ]);

    // 4. Double approve through the bridge starts exactly one submit.
    const run4 = await fill(app, window, id(104), { ...BASE_RESULT, status: 'filled' });
    const approvalId = (await rows(app, `SELECT id FROM approval WHERE run_id = '${run4}'`))[0]!.id as string;
    const outcomes = await window.evaluate(
      (approvalId) =>
        Promise.all([window.jobpilot!.inbox.approve(approvalId), window.jobpilot!.inbox.approve(approvalId)]).then(
          (r) => r.map((x) => x.outcome).sort(),
        ),
      approvalId,
    );
    expect(outcomes).toEqual(['already_decided', 'submitting']);
    expect(
      await inMain(
        app,
        (main) => main.fakeAgent!.history.filter((h) => h.prompt.includes('The owner approved')).length,
        0,
      ),
    ).toBe(2);
    await inMain(
      app,
      (main, runId) =>
        main.fakeAgent!.complete(runId, {
          status: 'failed',
          answers_used: [],
          answers_added: [],
          learned: [],
          blockers: [],
        }),
      run4,
    );
    await expect
      .poll(async () => (await rows(app!, `SELECT status FROM run WHERE id = '${run4}'`))[0]?.status)
      .toBe('failed');

    // 5. Consent: a revoked browser grant stops approval before anything changes.
    const run5 = await fill(app, window, id(105), { ...BASE_RESULT, status: 'filled' });
    // The answered job's "Saved, filling again" card stays until the owner opens another thread.
    await window
      .getByRole('button', { name: /Review/ })
      .first()
      .click();
    await window.evaluate(async () => {
      const grant = (await window.jobpilot!.grants.list()).find((g) => g.kind === 'browser')!;
      await window.jobpilot!.grants.revoke(grant.id);
    });
    await window
      .getByRole('complementary', { name: 'Details' })
      .getByRole('button', { name: 'Approve and send' })
      .click();
    await window
      .getByRole('complementary', { name: 'Details' })
      .getByRole('button', { name: /^Yes, send to/ })
      .click();
    await expect(window.getByRole('alert').filter({ hasText: 'not allowed' })).toBeVisible();
    expect(await rows(app, `SELECT status FROM approval WHERE run_id = '${run5}'`)).toEqual([{ status: 'pending' }]);
    expect(
      await inMain(
        app,
        (main) => main.fakeAgent!.history.filter((h) => h.prompt.includes('The owner approved')).length,
        0,
      ),
    ).toBe(2);

    // 6. Keyboard: J/K move through the threads, and Reject works from the keyboard alone.
    // The Allow runs a short test call; let the fake agent answer it quickly, then hold runs again.
    await inMain(app, (main) => (main.fakeAgent!.delayMs = 300), 0);
    await allowFakeConnections(window);
    await inMain(app, (main) => (main.fakeAgent!.delayMs = 60_000), 0);
    await fill(app, window, id(106), { ...BASE_RESULT, status: 'filled' });
    const current = window.locator('[aria-current="true"]');
    await expect(current).toHaveCount(1);
    const before = (await current.textContent()) ?? '';
    // The open thread may be first or last in the list: J and K together must reach the other one and come back.
    await window.keyboard.press('j');
    const afterJ = (await current.textContent()) ?? '';
    await window.keyboard.press('k');
    const afterK = (await current.textContent()) ?? '';
    expect(new Set([before, afterJ, afterK]).size).toBeGreaterThan(1);
    await window
      .getByRole('button', { name: /Review/ })
      .first()
      .click();
    const reject = window.getByRole('complementary', { name: 'Details' }).getByRole('button', { name: 'Reject' });
    await reject.focus();
    await window.keyboard.press('Enter');
    await expect
      .poll(async () => (await rows(app!, "SELECT status FROM approval WHERE status = 'rejected'")).length)
      .toBe(1);
    // 7. Enter never approves: Escape backs out of the confirm step, a stray Enter then does nothing, and there is
    // exactly one confirm control while confirming.
    const run7 = await fill(app, window, id(107), { ...BASE_RESULT, status: 'filled' });
    await window
      .getByRole('button', { name: /Review/ })
      .first()
      .click();
    const panel = window.getByRole('complementary', { name: 'Details' });
    await panel.getByRole('button', { name: 'Approve and send' }).click();
    await expect(window.getByRole('button', { name: /^Yes, send to/ })).toHaveCount(1);
    await window.keyboard.press('Escape');
    await expect(panel.getByRole('button', { name: 'Approve and send' })).toBeVisible();
    await window.keyboard.press('Enter');
    await window.keyboard.press('r');
    await window.waitForTimeout(300);
    expect(await rows(app, `SELECT status FROM approval WHERE run_id = '${run7}'`)).toEqual([{ status: 'pending' }]);
    for (const theme of ['light', 'dark'] as const) {
      await window.evaluate((source) => window.jobpilot!.theme.set(source), theme);
      await window.screenshot({ path: testInfo.outputPath(`inbox-after-reject-${theme}.png`), animations: 'disabled' });
    }
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
