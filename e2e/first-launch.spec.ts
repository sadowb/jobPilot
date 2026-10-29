import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMPTY_PROFILE } from '../src/renderer/src/features/profile/personal';

// eslint-disable-next-line no-empty-pattern
test('fresh profile opens onboarding and contains only real empty states', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-first-launch-'));
  const packaged = testInfo.project.name === 'packaged';
  const options = {
    ...(packaged
      ? {
          executablePath:
            process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot',
        }
      : {}),
    args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
    timeout: 60_000,
  };
  let app: ElectronApplication | undefined;
  try {
    app = await electron.launch(options);
    let window = await app.firstWindow();
    await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/1');
    expect((await window.evaluate(() => window.jobpilot!.profile.get())).personal).toBeNull();
    expect(await window.evaluate(() => window.jobpilot!.applications.list())).toEqual([]);
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.emulateMedia({ reducedMotion: 'reduce' });
    const capture = async (name: string) => {
      await expect(window.locator('body')).not.toContainText(
        /Mercury|Retool|Duolingo|Perpay|Clark|Ramp|Figma|Brex|Sara Benali/,
      );
      for (const theme of ['light', 'dark'] as const) {
        await window.evaluate((theme) => window.jobpilot!.theme.set(theme), theme);
        await expect(window.locator('html')).toHaveCSS('color-scheme', theme);
        await window.screenshot({ path: testInfo.outputPath(`${name}-${theme}.png`), animations: 'disabled' });
      }
    };
    await capture('first-launch');
    await app.close();
    app = await electron.launch(options);
    window = await app.firstWindow();
    await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/1');
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.emulateMedia({ reducedMotion: 'reduce' });
    await expect(window.getByRole('button', { name: '← Back' })).toHaveCount(0);
    await expect(window.locator('body')).not.toContainText('Route ·');
    for (const step of [2, 3, 4, 5]) {
      await window.evaluate((step) => {
        location.hash = `#/welcome/${step}`;
      }, step);
      await expect(window.getByRole('img', { name: `Step ${step} of 5` })).toBeVisible();
      await expect(window.getByRole('img', { name: `Step ${step} of 5` })).toContainText(`Step ${step} of 5 ·`);
      await expect(window.getByRole('button', { name: '← Back' })).toBeVisible();
      const cta = await window
        .getByRole('button', { name: /^(Continue|Skip this step|Open dashboard)$/ })
        .boundingBox();
      expect(cta!.y + cta!.height).toBeLessThanOrEqual(800);
      if (step === 3) await expect(window.locator('body')).not.toContainText(/Add \d+ jobs|ashbyhq|greenhouse/);
      await capture(`onboarding-${step}`);
      if (step === 2) {
        await window.getByLabel('Upload CV').setInputFiles({
          name: 'Sample_CV.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4 sample'),
        });
        await expect(window.getByText('Sample_CV.pdf saved on this device.')).toBeVisible();
        await expect(window.getByRole('button', { name: 'Continue' })).toBeVisible();
        await capture('onboarding-2-uploaded');
      }
      if (step === 4) {
        await window.getByRole('radio', { name: 'No, I don’t' }).click();
        await window.getByRole('radio', { name: '$90k' }).click();
        await window.getByRole('button', { name: '← Back' }).click();
        await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/3');
        await window.getByRole('button', { name: 'Continue' }).click();
        await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/4');
        await expect(window.getByText('2 of 3')).toBeVisible();
        await capture('onboarding-4-answered');
        await window.getByRole('button', { name: 'Continue' }).click();
        await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/5');
        const saved = await window.evaluate(() => window.jobpilot!.profile.get());
        expect(saved.answers?.map((a) => [a.id, a.default])).toEqual(
          expect.arrayContaining([
            ['sponsorship', 'No, I don’t'],
            ['salary-floor', '$90k'],
          ]),
        );
      }
      if (step === 5) {
        await expect(window.getByText('2 of 3 answered')).toBeVisible();
        await expect(window.getByText('1 saved on this device')).toBeVisible();
        await expect(window.getByText('No jobs added yet')).toBeVisible();
      }
    }
    await window.getByRole('button', { name: 'Open dashboard' }).click();
    await expect(window.getByText('No applications yet', { exact: true })).toBeVisible();
    const completed = await window.evaluate(() => window.jobpilot!.profile.get());
    expect(typeof completed.onboardingCompletedAt).toBe('number');
    await expect(window.getByRole('button', { name: 'All 0', exact: true })).toBeVisible();
    await expect(window.locator('body')).not.toContainText('No jobs match “');
    await expect(window.getByRole('link', { name: 'Inbox', exact: true })).toBeVisible();
    await capture('empty-applied');
    await window.getByRole('tab', { name: /Up next 0/ }).click();
    await expect(window.getByText('Nothing queued. Add jobs to start the crew.')).toBeVisible();
    await expect(window.getByText('CREW IDLE · 0 / 6 RUNNING')).toBeVisible();
    await expect(window.locator('body')).not.toContainText('BUSY');
    await capture('empty-up-next');
    for (const [route, title, name] of [
      ['/inbox', 'Inbox', 'empty-inbox'],
      ['/analytics', 'Analytics', 'empty-analytics'],
      ['/fixes', 'Fixes', 'empty-fixes'],
      ['/extension', 'Extension', 'empty-extension'],
      ['/settings', 'Settings', 'empty-settings'],
      ['/first-day', 'Dashboard', 'first-day'],
    ]) {
      await window.evaluate((route) => {
        location.hash = `#${route}`;
      }, route!);
      if (route === '/settings') {
        await expect(window.getByRole('dialog', { name: 'Settings' })).toBeVisible();
        // Modal: focus moves inside, and the page behind is inert.
        expect(await window.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
        expect(await window.evaluate(() => !!document.querySelector('dialog:modal'))).toBe(true);
      } else await expect(window.getByRole('heading', { name: title!, exact: true })).toBeVisible();
      await expect(window.locator('body')).not.toContainText(/Arrives with|Phase \d/);
      if (route === '/inbox') {
        await expect(window.getByText('Nothing needs you', { exact: true })).toBeVisible();
        await expect(window.getByRole('button', { name: 'Open Up next' })).toBeVisible();
      }
      await capture(name!);
      if (route === '/settings') {
        await window.getByRole('heading', { name: 'Site logins', exact: true }).scrollIntoViewIfNeeded();
        await capture('empty-settings-logins');
      }
    }
    // A strict limit: a decimal is rejected with an inline error and nothing is saved.
    await window.evaluate(() => {
      location.hash = '#/settings';
    });
    const cost = window.getByRole('textbox', { name: /Cost limit/ });
    await cost.fill('2.5');
    await cost.press('Enter');
    await expect(window.getByRole('alert').filter({ hasText: 'whole number' })).toBeVisible();
    expect((await window.evaluate(() => window.jobpilot!.settings.get())).limits.costPerDay).toBe(5);
    expect((await window.evaluate(() => window.jobpilot!.settings.get())).crew).toBe(6);
    await expect(
      window.evaluate(() => window.jobpilot!.settings.update({ autopilot: true } as never)),
    ).rejects.toThrow();
    // Esc closes the sheet and focus returns to the page, not the void.
    await window.keyboard.press('Escape');
    await expect(window.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
    // Unknown routes get a product page, not the router's developer error.
    await window.evaluate(() => {
      location.hash = '#/nope-404';
    });
    await expect(window.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(window.locator('body')).not.toContainText('Hey developer');
    // The command box is modal and reports why nothing matches.
    await window.getByRole('link', { name: 'Back to dashboard' }).click();
    await window.keyboard.press('Control+K');
    await expect(window.getByRole('dialog', { name: 'Ask Cap' })).toBeVisible();
    await window.keyboard.press('Escape');
    await expect(window.getByRole('dialog', { name: 'Ask Cap' })).toHaveCount(0);
    // Profile presence is persisted by main; clearing browser storage cannot turn it into a fresh profile.
    await window.evaluate(
      async (personal) => {
        await window.jobpilot!.profile.save({ section: 'personal', value: personal });
        localStorage.clear();
      },
      { ...EMPTY_PROFILE, firstName: 'Ada', lastName: 'Lovelace' },
    );
    await app.close();
    app = await electron.launch(options);
    window = await app.firstWindow();
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(window.getByText('No applications yet', { exact: true })).toBeVisible();
    expect((await window.evaluate(() => window.jobpilot!.profile.get())).personal?.firstName).toBe('Ada');
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.emulateMedia({ reducedMotion: 'reduce' });
    await app.evaluate(({ app }) => {
      const path = process.getBuiltinModule('node:path')!;
      const require = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as typeof import('../src/main/app/main');
      const db = main.db.$client;
      const id = (n: number) => String(n).padStart(26, '0');
      const now = Date.now();
      db.prepare('INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        id(100),
        'Northstar Research',
        'northstar-research',
        now,
        now,
      );
      for (const [i, status] of ['applied', 'interviewing', 'queued'].entries()) {
        const url = `https://example.invalid/jobs/${i}`;
        db.prepare(
          'INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          id(101 + i),
          id(100),
          url,
          url,
          'custom',
          ['Software Engineer', 'Data Engineer', 'Product Engineer'][i],
          now,
          now,
        );
        db.prepare(
          'INSERT INTO application (id, posting_id, status, queue_rank, applied_at, last_activity_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(id(201 + i), id(101 + i), status, i + 1, status === 'queued' ? null : now, now, now, now);
      }
    });
    await window.reload();
    await expect(window.getByRole('tab', { name: 'Applied 2', exact: true })).toBeVisible();
    await expect(window.getByRole('tab', { name: 'Up next 1', exact: true })).toBeVisible();
    await expect(window.getByRole('button', { name: 'All 2', exact: true })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Submitted 1', exact: true })).toBeVisible();
    await expect(window.getByText('Showing 1–2 of 2')).toBeVisible();
    const perPage = window.getByRole('combobox', { name: 'Rows per page' });
    await expect(perPage).toHaveValue('10');
    expect(await perPage.locator('option').allTextContents()).toEqual(['10 per page', '25 per page', '50 per page']);
    await capture('real-applied');
    await window.getByRole('tab', { name: 'Up next 1', exact: true }).click();
    await expect(window.getByText('CREW IDLE · 0 / 6 RUNNING')).toBeVisible();
    await capture('real-up-next');
    await window.getByRole('tab', { name: /Applied 2/ }).click();
    await window.getByPlaceholder('Search company, role, location').fill('missing employer');
    await expect(window.getByText('No jobs match “missing employer”')).toBeVisible();
    await window.getByRole('button', { name: 'Clear filters' }).click();
    await window.getByRole('button', { name: 'Rejected 0', exact: true }).click();
    await expect(window.getByText('No applications in this filter')).toBeVisible();
    await expect(window.locator('body')).not.toContainText('No jobs match “');
    await window.getByRole('button', { name: 'All 2', exact: true }).click();
    await window.getByRole('row').filter({ hasText: 'Software Engineer' }).click();
    await window.getByRole('button', { name: 'View full size' }).click();
    await expect(window.getByRole('dialog', { name: 'Application CV' })).toBeVisible();
    await expect(window.getByText('No CV pinned to this application.')).toBeVisible();
    await capture('unavailable-application-cv');
    await window.getByRole('button', { name: 'Done', exact: true }).click();
    await window.getByRole('button', { name: '⌘K Ask Cap' }).click();
    await expect(window.getByRole('dialog', { name: 'Ask Cap' })).toBeVisible();
    await capture('empty-command-search');
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
