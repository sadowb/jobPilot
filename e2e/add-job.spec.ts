import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const recording = z
  .object({ source: z.url(), response: z.object({ id: z.number(), title: z.string() }).passthrough() })
  .parse(JSON.parse(readFileSync(new URL('./fixtures/greenhouse.json', import.meta.url), 'utf8')));
const jobUrl = `https://boards.greenhouse.io/perpay/jobs/${recording.response.id}`;

// eslint-disable-next-line no-empty-pattern
test('paste a job, preview real ATS data, add once, and retain it after restart', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-add-job-'));
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
    const window = await app.firstWindow();
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect.poll(() => window.evaluate(() => window.jobpilot!.applications.list())).toEqual([]);

    // Mock the HTTP transport in main; the packaged adapters, parsers, IPC, and DB still execute.
    await app.evaluate(({ app }, fixture) => {
      const path = process.getBuiltinModule('node:path')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { MockAgent, setGlobalDispatcher } = nodeRequire('undici') as typeof import('undici');
      const mock = new MockAgent();
      mock.disableNetConnect();
      const source = new URL(fixture.source);
      source.searchParams.sort();
      mock
        .get(source.origin)
        .intercept({ path: `${source.pathname}${source.search}`, method: 'GET' })
        .reply(200, fixture.response, { headers: { 'content-type': 'application/json' } })
        .persist();
      let requests = 0;
      const dispatch = mock.dispatch.bind(mock);
      mock.dispatch = (...args) => {
        requests++;
        return dispatch(...args);
      };
      setGlobalDispatcher(mock);
      Object.assign(globalThis, { postingRequestCount: () => requests });
    }, recording);
    const requestCount = () =>
      app!.evaluate(() =>
        (globalThis as typeof globalThis & { postingRequestCount: () => number }).postingRequestCount(),
      );

    for (const url of [
      'https://example.com/job',
      'https://boards.greenhouse.io.evil.example/perpay/jobs/123',
      'https://boards.greenhouse.io/not-a-job',
    ]) {
      const result = await window.evaluate((url) => window.jobpilot!.postings.ingest(url), url);
      expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_ATS' });
    }
    for (const url of [
      'http://boards.greenhouse.io/perpay/jobs/123',
      'https://name:password@boards.greenhouse.io/perpay/jobs/123',
      `https://boards.greenhouse.io/${'x'.repeat(2048)}`,
      'not a url',
    ]) {
      expect(
        await window.evaluate(async (url) => {
          try {
            await window.jobpilot!.postings.ingest(url);
            return false;
          } catch {
            return true;
          }
        }, url),
      ).toBe(true);
    }
    expect(await requestCount()).toBe(0);

    await window.getByRole('button', { name: /^Add jobs/ }).click();
    await window.getByLabel('Job URL', { exact: true }).fill('https://example.com/job');
    await window.getByRole('button', { name: 'Preview job', exact: true }).click();
    await expect(window.getByRole('alert')).toContainText('Use a Greenhouse');
    expect(await requestCount()).toBe(0);
    await window.getByRole('button', { name: 'Cancel', exact: true }).click();
    await window.evaluate((url) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text', url);
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
    }, jobUrl);
    await expect(window.getByLabel('Job URL', { exact: true })).toHaveValue(jobUrl);
    await window.getByRole('button', { name: 'Preview job', exact: true }).click();
    await expect(window.getByRole('region', { name: 'Posting preview' })).toContainText(recording.response.title);
    expect(await window.evaluate(() => window.jobpilot!.applications.list())).toEqual([]);
    await window.getByRole('button', { name: 'Add to Up next', exact: true }).click();
    await expect(window.getByRole('dialog')).toHaveCount(0);
    await expect(window.getByRole('row').filter({ hasText: recording.response.title })).toHaveCount(1);
    const [item] = await window.evaluate(() => window.jobpilot!.applications.list());
    expect(item).toMatchObject({ title: recording.response.title, status: 'queued', queueRank: 1 });
    expect(item).not.toHaveProperty('questions');
    expect(item).not.toHaveProperty('content');

    // Same URL, tracking variant, alternate Greenhouse host, and concurrent creates all reuse the row.
    for (const url of [
      jobUrl,
      `${jobUrl}?utm_source=test#application`,
      jobUrl.replace('boards.greenhouse.io', 'job-boards.greenhouse.io'),
    ]) {
      const result = await window.evaluate((url) => window.jobpilot!.postings.ingest(url), url);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      expect(result.posting.postingId).toBe(item!.postingId);
      const ids = await window.evaluate(
        async (postingId) =>
          (
            await Promise.all([
              window.jobpilot!.applications.create(postingId),
              window.jobpilot!.applications.create(postingId),
            ])
          ).map((row) => row.id),
        result.posting.postingId,
      );
      expect(ids).toEqual([item!.id, item!.id]);
    }
    const persisted = await window.evaluate(() => window.jobpilot!.applications.list());
    expect(persisted).toHaveLength(1);

    const events = await app.evaluate(async ({ app }) => {
      const path = process.getBuiltinModule('node:path')!;
      const fs = process.getBuiltinModule('node:fs')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const { safeStorage } = nodeRequire('electron') as typeof import('electron');
      const Database = nodeRequire('better-sqlite3') as typeof import('better-sqlite3');
      const { result } = await safeStorage.decryptStringAsync(
        fs.readFileSync(path.join(app.getPath('userData'), 'db-key.enc')),
      );
      const key = Buffer.from(result, 'base64');
      const database = new Database(path.join(app.getPath('userData'), 'jobpilot.db'), { readonly: true });
      try {
        database.pragma("cipher='sqlcipher'");
        database.key(key);
        return database.prepare('SELECT type, actor, from_status, to_status FROM application_event').all();
      } finally {
        database.close();
        key.fill(0);
      }
    });
    expect(events).toEqual([{ type: 'created', actor: 'owner', from_status: null, to_status: 'queued' }]);

    await app.close();
    app = await electron.launch(options);
    const restarted = await app.firstWindow();
    await expect(restarted.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await restarted.evaluate(() => {
      location.hash = '#/?tab=up-next';
    });
    await expect(restarted.getByRole('row').filter({ hasText: recording.response.title })).toHaveCount(1);
    expect(await restarted.evaluate(() => window.jobpilot!.applications.list())).toEqual(persisted);
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
