import { skipOnboarding } from './onboarding';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Main = typeof import('../src/main/app/main');

// eslint-disable-next-line no-empty-pattern
test('Up next updates live, with no reload, as two runs change state', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-live-list-'));
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
    await skipOnboarding(window);
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    const ids = await app.evaluate(async ({ app }) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      main.fakeAgent!.delayMs = 60_000;
      const db = main.db.$client;
      const id = (n: number) => String(n).padStart(26, '0');
      db.prepare('INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        id(0),
        'Benali Studio',
        'benali-studio',
        1,
        1,
      );
      for (let i = 1; i <= 2; i++) {
        db.prepare(
          'INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          id(i),
          id(0),
          `https://example.invalid/jobs/${i}`,
          `https://example.invalid/jobs/${i}`,
          'custom',
          `Frontend Engineer ${i}`,
          1,
          1,
        );
        db.prepare(
          'INSERT INTO application (id, posting_id, status, queue_rank, last_activity_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(id(i + 100), id(i), 'queued', i, 1, 1, 1);
      }
      return [id(101), id(102)];
    });

    // Seeded straight into the DB (no event), so reload once to load them; everything after must be live.
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.reload();
    await skipOnboarding(window);
    await window.evaluate(() => {
      location.hash = '#/?tab=up-next';
    });
    await expect(window.getByText('Frontend Engineer 1')).toBeVisible();
    await expect(window.getByText('CREW IDLE · 0 / 6 RUNNING')).toBeVisible();

    // A navigation marker proves the page is never reloaded while the list changes.
    await window.evaluate(() => {
      (window as unknown as { liveMarker: number }).liveMarker = 1;
    });
    const runs = await window.evaluate(
      (applicationIds) => Promise.all(applicationIds.map((id) => window.jobpilot!.runs.start(id))),
      ids,
    );
    await expect(window.getByText(/CREW 2 \/ 6 BUSY/)).toBeVisible();
    await expect(window.getByText('NOW', { exact: true })).toHaveCount(2);
    await window.screenshot({ path: testInfo.outputPath('up-next-running-light.png'), animations: 'disabled' });

    await app.evaluate(
      ({ app }, runIds) => {
        const path = process.getBuiltinModule('node:path')!;
        const require = process
          .getBuiltinModule('node:module')!
          .createRequire(path.join(app.getAppPath(), 'package.json'));
        const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
        for (const id of runIds)
          main.fakeAgent!.complete(id, {
            status: 'filled',
            answers_used: [],
            answers_added: [],
            learned: [],
            blockers: [],
            form_hash: `fake-${id}`,
          });
      },
      runs.map((run) => run.id),
    );
    await expect(window.getByText('WAIT', { exact: true })).toHaveCount(2);
    await expect(window.getByText('NOW', { exact: true })).toHaveCount(0);
    expect(await window.evaluate(() => (window as unknown as { liveMarker?: number }).liveMarker)).toBe(1);

    await window.evaluate(async () => {
      await window.jobpilot!.theme.set('dark');
    });
    await expect(window.locator('html')).toHaveClass(/dark/);
    await window.screenshot({ path: testInfo.outputPath('up-next-waiting-dark.png'), animations: 'disabled' });
    await window.evaluate(async () => {
      await window.jobpilot!.theme.set('light');
    });
    await expect(window.locator('html')).not.toHaveClass(/dark/);
    await window.screenshot({ path: testInfo.outputPath('up-next-waiting-light.png'), animations: 'disabled' });
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
