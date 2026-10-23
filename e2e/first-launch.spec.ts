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
      for (const theme of ['light', 'dark']) {
        await window.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
        await window.screenshot({ path: testInfo.outputPath(`${name}-${theme}.png`) });
      }
    };
    await capture('first-launch');
    await app.close();
    app = await electron.launch(options);
    window = await app.firstWindow();
    await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/1');
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.emulateMedia({ reducedMotion: 'reduce' });
    for (const step of [2, 3, 4, 5]) {
      await window.evaluate((step) => {
        location.hash = `#/welcome/${step}`;
      }, step);
      await expect(window.getByRole('img', { name: `Step ${step} of 5` })).toBeVisible();
      await capture(`onboarding-${step}`);
    }
    await window.getByRole('button', { name: 'Open dashboard' }).click();
    await expect(window.getByText('No applications yet', { exact: true })).toBeVisible();
    await expect(window.getByRole('button', { name: 'All 0', exact: true })).toBeVisible();
    await expect(window.locator('body')).not.toContainText('No jobs match “');
    await expect(window.getByRole('link', { name: 'Inbox', exact: true })).toBeVisible();
    await capture('empty-applied');
    await window.getByRole('tab', { name: /Up next 0/ }).click();
    await expect(window.getByText('Nothing queued. Add jobs to start the crew.')).toBeVisible();
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
      if (route === '/settings') await expect(window.getByRole('dialog', { name: 'Settings' })).toBeVisible();
      else await expect(window.getByRole('heading', { name: title!, exact: true })).toBeVisible();
      await capture(name!);
    }
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
      for (const [i, status] of ['submitted', 'interviewing', 'queued'].entries()) {
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
    await capture('real-applied');
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
