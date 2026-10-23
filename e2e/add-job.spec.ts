import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const recording = z
  .object({ source: z.url(), response: z.object({ id: z.number(), title: z.string() }).passthrough() })
  .parse(JSON.parse(readFileSync(join(__dirname, 'fixtures/greenhouse.json'), 'utf8')));
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
      const undici = nodeRequire('undici') as typeof import('undici');
      const { MockAgent, Agent } = undici;
      const dns = nodeRequire('node:dns/promises') as typeof import('node:dns/promises');
      const assert = nodeRequire('node:assert/strict') as typeof import('node:assert/strict');
      const blocked = [
        '0.0.0.0',
        '10.0.0.1',
        '100.64.0.1',
        '127.0.0.1',
        '169.254.169.254',
        '172.16.0.1',
        '192.168.0.1',
        '224.0.0.1',
        '255.255.255.255',
        '::',
        '::1',
        'fc00::1',
        'fe80::1',
        'ff02::1',
        '::ffff:127.0.0.1',
        '64:ff9b::7f00:1',
        '2002:7f00:1::',
      ];
      const resolutions: string[] = [];
      dns.lookup = (async (hostname: string) => {
        resolutions.push(hostname);
        const index = /^blocked-(\d+)\.example$/.exec(hostname)?.[1];
        const address =
          index !== undefined
            ? blocked[Number(index)]!
            : hostname === 'private.greenhouse.io'
              ? '127.0.0.1'
              : hostname === 'rebind.example' && resolutions.filter((host) => host === hostname).length > 1
                ? '10.0.0.1'
                : hostname === 'ipv6.example'
                  ? '2606:4700:4700::1111'
                  : '93.184.216.34';
        const record = { address, family: address.includes(':') ? 6 : 4 };
        return hostname === 'mixed.example' ? [record, { address: '10.0.0.1', family: 4 }] : [record];
      }) as typeof dns.lookup;
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
      // Exercise the packaged pinning callback for both Node lookup shapes, then mock the socket transport.
      undici.Agent = class extends Agent {
        constructor(private readonly settings: import('undici').Agent.Options = {}) {
          super(settings);
        }
        override dispatch(
          options: import('undici').Agent.DispatchOptions,
          handler: import('undici').Dispatcher.DispatchHandler,
        ) {
          const connect = this.settings.connect;
          assert.ok(connect && typeof connect === 'object' && connect.lookup);
          const hostname = new URL(String(options.origin)).hostname;
          const expected =
            hostname === 'ipv6.example'
              ? { address: '2606:4700:4700::1111', family: 6 }
              : { address: '93.184.216.34', family: 4 };
          connect.lookup(hostname, {}, (error, address, family) => {
            assert.equal(error, null);
            assert.equal(address, expected.address);
            assert.equal(family, expected.family);
          });
          connect.lookup(hostname, { all: true }, (error, addresses) => {
            assert.equal(error, null);
            assert.deepEqual(addresses, [expected]);
          });
          return mock.dispatch(options, handler);
        }
      };
      const html =
        '<html><head><title>Custom role</title></head><body><label>Name<input name="name" required></label>';
      mock
        .get('https://custom.example')
        .intercept({ path: '/poison' })
        .reply(
          200,
          html + `<link rel="canonical" href="https://boards.greenhouse.io/perpay/jobs/${fixture.response.id}">`,
        );
      mock
        .get('https://custom.example')
        .intercept({ path: '/relative' })
        .reply(200, html + '<link rel="canonical" href="/real-job?utm_source=test">');
      mock
        .get('https://custom.example')
        .intercept({ path: '/invalid' })
        .reply(200, html + '<link rel="canonical" href="http://custom.example/downgrade">');
      mock
        .get('https://custom.example')
        .intercept({ path: '/redirect' })
        .reply(302, 'redirect body', { headers: { location: 'https://landing.example/job' } });
      mock
        .get('https://landing.example')
        .intercept({ path: '/job' })
        .reply(200, html + '<link rel="canonical" href="/canonical">');
      mock.get('https://ipv6.example').intercept({ path: '/job' }).reply(200, html);
      mock
        .get('https://rebind.example')
        .intercept({ path: '/job' })
        .reply(302, 'redirect body', { headers: { location: '/again' } });
      for (const [id, location] of [
        ['111', 'https://other.greenhouse.io/job'],
        ['112', 'https://evil.example/job'],
        ['113', 'http://boards-api.greenhouse.io/job'],
        ['114', 'https://private.greenhouse.io/job'],
        ['115', 'https://boards-api.greenhouse.io.evil.example/job'],
      ])
        mock
          .get(source.origin)
          .intercept({ path: `/v1/boards/perpay/jobs/${id}?pay_transparency=true&questions=true` })
          .reply(302, 'redirect body', { headers: { location } });
      mock.get('https://other.greenhouse.io').intercept({ path: '/job' }).reply(200, fixture.response);
      Object.assign(globalThis, {
        postingRequestCount: () => requests,
        postingResolutions: () => [...resolutions],
        blockedPostingHosts: blocked.map((_, index) => `https://blocked-${index}.example/job`),
      });
    }, recording);
    const requestCount = () =>
      app!.evaluate(() =>
        (globalThis as typeof globalThis & { postingRequestCount: () => number }).postingRequestCount(),
      );

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

    const blockedHosts = await app.evaluate(
      () => (globalThis as typeof globalThis & { blockedPostingHosts: string[] }).blockedPostingHosts,
    );
    for (const url of [
      ...blockedHosts,
      'https://mixed.example/job',
      'https://localhost./job',
      'https://foo.localhost./job',
    ]) {
      const result = await window.evaluate((url) => window.jobpilot!.postings.ingest(url), url);
      expect(result).toMatchObject({ ok: false, code: 'FETCH_FAILED' });
    }
    expect(await requestCount()).toBe(0);
    for (const [path, canonical] of [
      ['poison', 'https://custom.example/poison'],
      ['relative', 'https://custom.example/real-job'],
      ['invalid', 'https://custom.example/invalid'],
      ['redirect', 'https://landing.example/canonical'],
    ]) {
      const result = await window.evaluate(
        (url) => window.jobpilot!.postings.ingest(url),
        `https://custom.example/${path}`,
      );
      expect(result).toMatchObject({
        ok: true,
        posting: { ats: 'custom', canonical_url: canonical, title: 'Custom role' },
      });
      if (!result.ok) throw new Error(result.message);
      expect(result.posting.questions).toContainEqual(
        expect.objectContaining({ external_id: 'html:name', required: true }),
      );
    }
    expect(await window.evaluate(() => window.jobpilot!.postings.ingest('https://ipv6.example/job'))).toMatchObject({
      ok: true,
    });
    for (const url of [
      'https://rebind.example/job',
      ...['112', '113', '114', '115'].map((id) => `https://boards.greenhouse.io/perpay/jobs/${id}`),
    ]) {
      const before = await requestCount();
      expect(await window.evaluate((url) => window.jobpilot!.postings.ingest(url), url)).toMatchObject({
        ok: false,
        code: 'FETCH_FAILED',
      });
      expect(await requestCount()).toBe(before + 1);
    }
    const resolutions = await app.evaluate(() =>
      (globalThis as typeof globalThis & { postingResolutions: () => string[] }).postingResolutions(),
    );
    expect(resolutions.filter((host) => host === 'rebind.example')).toHaveLength(2);
    expect(resolutions).not.toContain('evil.example');
    expect(resolutions).not.toContain('boards-api.greenhouse.io.evil.example');
    expect(resolutions).toContain('private.greenhouse.io');
    expect(
      await window.evaluate(() => window.jobpilot!.postings.ingest('https://boards.greenhouse.io/perpay/jobs/111')),
    ).toMatchObject({ ok: true });

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
