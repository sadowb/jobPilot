import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { skipOnboarding } from './onboarding';

type Main = typeof import('../src/main/app/main');

interface Hist {
  mcpServers: string[];
  recalled: string[];
  prompt: string;
  toolAllowlist?: Record<string, string[]>;
}

const QUIRK = 'Scroll to the bottom before the Submit button enables';

// Network is never touched: JOBPILOT_E2E_PROVIDER=fake swaps the Mnemosyne installer and the agent's
// memory tool calls for FakeMemoryProvider / FakeAgentProvider (same seam as the fake agent and browser).
// eslint-disable-next-line no-empty-pattern
test('memory: install on request, a second run on the same site recalls the first run quirk, nothing leaves userData', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-memory-'));
  // Overriding HOME breaks Keychain lookup in the packaged app, so check the real home before/after instead.
  const watched = ['.mnemosyne', '.cache/uv', '.local/share/uv', '.local/bin/mnemosyne'].map((p) => join(homedir(), p));
  const before = watched.map((p) => existsSync(p));
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
    // Inspector evaluates need an idle tick before touching main-process state (see runs.spec.ts).
    const probe = (action: 'history' | 'consolidations' | 'consolidate-now') =>
      app!.evaluate(async ({ app }, what) => {
        await new Promise((resolve) => setImmediate(resolve));
        const path = process.getBuiltinModule('node:path')!;
        const require = process
          .getBuiltinModule('node:module')!
          .createRequire(path.join(app.getAppPath(), 'package.json'));
        const loaded = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
        if (what === 'consolidate-now') await loaded.consolidation.runNow();
        return what === 'history'
          ? loaded.fakeAgent!.history.map((h) => ({ ...h }))
          : loaded.fakeMemory!.consolidations;
      }, action);
    const window = await app.firstWindow();
    await skipOnboarding(window);
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();

    // Three applications on the same mocked site.
    await app.evaluate(async ({ app }) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const m = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      m.fakeAgent!.delayMs = 60_000;
      const db = m.db.$client;
      const id = (n: number) => String(n).padStart(26, '0');
      db.prepare('INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        id(0),
        'Memory employer',
        'memory-employer',
        1,
        1,
      );
      for (let i = 1; i <= 3; i++) {
        const url = `https://careers.memory.invalid/jobs/${i}`;
        db.prepare(
          'INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(id(i), id(0), url, url, 'custom', `Memory job ${i}`, 1, 1);
        db.prepare(
          'INSERT INTO application (id, posting_id, status, queue_rank, last_activity_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(id(i + 100), id(i), 'queued', i, 1, 1, 1);
      }
    });
    const applicationIds = [101, 102, 103].map((n) => String(n).padStart(26, '0'));
    const history = async () => (await probe('history')) as Hist[];
    async function runToApproval(index: number, learned: string[]) {
      const run = await window.evaluate((id) => window.jobpilot!.runs.start(id), applicationIds[index]!);
      await expect.poll(async () => (await history()).length).toBe(index + 1);
      await app!.evaluate(
        ({ app }, input) => {
          const path = process.getBuiltinModule('node:path')!;
          const require = process
            .getBuiltinModule('node:module')!
            .createRequire(path.join(app.getAppPath(), 'package.json'));
          const loaded = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
          loaded.fakeAgent!.complete(input.runId, {
            status: 'filled',
            answers_used: [],
            answers_added: [],
            learned: input.learned,
            blockers: [],
            form_hash: `fake-${input.runId}`,
          });
        },
        { runId: run.id, learned },
      );
      await expect
        .poll(
          async () =>
            (await window.evaluate(() => window.jobpilot!.runs.list())).find((row) => row.id === run.id)?.status,
        )
        .toBe('awaiting_approval');
    }

    // 1. Memory not installed: the run still works and has no memory server.
    await runToApproval(0, []);
    expect((await history())[0]).toMatchObject({ mcpServers: ['browser'], recalled: [] });

    // 2. Owner installs memory from Settings.
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.evaluate(() => {
      location.hash = '#/settings';
    });
    await expect(window.getByTestId('memory-status')).toHaveText('Not installed');
    await window.screenshot({ path: testInfo.outputPath('settings-memory-before-light.png') });
    await window.getByRole('button', { name: 'Install memory' }).click();
    await expect(window.getByTestId('memory-status')).toHaveText('Ready');
    await window.screenshot({ path: testInfo.outputPath('settings-memory-light.png') });
    await window.evaluate(() => window.jobpilot!.theme.set('dark'));
    await window.screenshot({ path: testInfo.outputPath('settings-memory-dark.png') });
    await window.evaluate(() => window.jobpilot!.theme.set('light'));

    // 3. Run 2 stores a quirk; run 3 on the same host recalls it.
    await runToApproval(1, [QUIRK]);
    const second = (await history())[1]!;
    expect(second.mcpServers).toEqual(['browser', 'memory']);
    expect(second.toolAllowlist).toEqual({ memory: ['mnemosyne_recall', 'mnemosyne_remember'] });
    expect(second.prompt).toContain('mnemosyne_recall');
    expect(second.prompt).toContain('mnemosyne_remember');
    expect(second.recalled).toEqual([]);
    await runToApproval(2, []);
    const third = (await history())[2]!;
    expect(third.recalled).toEqual([`careers.memory.invalid: ${QUIRK}`]);
    expect(readFileSync(join(userData, 'mnemosyne', 'notes.json'), 'utf8')).toContain(QUIRK);

    // 4. Consolidation runs through the same liteque path as the nightly job.
    await probe('consolidate-now');
    await expect.poll(() => probe('consolidations'), { timeout: 15_000 }).toBe(1);

    // 5. Settings removes the memory data.
    await window.getByRole('button', { name: 'Remove memory and its data' }).click();
    await window.getByRole('button', { name: 'Remove everything' }).click();
    await expect(window.getByTestId('memory-status')).toHaveText('Not installed');
    expect(existsSync(join(userData, 'mnemosyne'))).toBe(false);

    // 6. Quit leaves no process of ours, and nothing was written under HOME.
    await app.close();
    app = undefined;
    expect(execFileSync('ps', ['-axo', 'command']).toString()).not.toContain(userData);
    expect(watched.map((p) => existsSync(p))).toEqual(before);
  } finally {
    await app?.close().catch(() => undefined);
    rmSync(userData, { recursive: true, force: true });
  }
});
