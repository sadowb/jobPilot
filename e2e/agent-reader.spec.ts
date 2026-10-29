import { skipOnboarding } from './onboarding';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Main = typeof import('../src/main/app/main');

const jobUrl = 'https://careers.example.com/jobs/platform-engineer';

// eslint-disable-next-line no-empty-pattern
test('a custom career page without JSON-LD is read by the agent and ends Ready', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-agent-reader-'));
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

    // Fake the network (a JS-rendered shell with no JSON-LD) and the agent's answer; DB, IPC, reader and renderer are real.
    await app.evaluate(async ({ app }, url) => {
      await new Promise((resolve) => setImmediate(resolve));
      const path = process.getBuiltinModule('node:path')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const main = nodeRequire(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      const undici = nodeRequire('undici') as typeof import('undici');
      const dns = nodeRequire('node:dns/promises') as typeof import('node:dns/promises');
      dns.lookup = (async () => [{ address: '93.184.216.34', family: 4 }]) as unknown as typeof dns.lookup;
      const mock = new undici.MockAgent();
      mock.disableNetConnect();
      const target = new URL(url);
      mock
        .get(target.origin)
        .intercept({ path: target.pathname })
        .reply(200, '<html><body><div id="app"></div></body></html>', { headers: { 'content-type': 'text/html' } })
        .persist();
      undici.Agent = class extends undici.Agent {
        override dispatch(
          options: import('undici').Agent.DispatchOptions,
          handler: import('undici').Dispatcher.DispatchHandler,
        ) {
          return mock.dispatch(options, handler);
        }
      };
      main.fakeAgent!.delayMs = 1500;
      main.fakeAgent!.reply = (spec) =>
        spec.toolAllowlist?.browser
          ? {
              isJobPosting: true,
              notJobReason: null,
              title: 'Platform Engineer',
              company: 'Example Co',
              location: 'Lisbon',
              country: 'Portugal',
              remote: false,
              employmentType: 'Full-time',
              salary: null,
              description: 'Build the platform.',
              questions: [{ label: 'Why us?', type: 'textarea', required: true, options: [] }],
              applyUrl: null,
            }
          : undefined;
    }, jobUrl);

    await window.evaluate((url) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text', url);
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
    }, jobUrl);
    const previews = window.getByRole('list', { name: 'Job previews' });
    await expect(previews).toContainText('Reading with agent');
    await expect(previews).toContainText('Example Co — Platform Engineer');
    await expect(previews).toContainText('Ready');
    await expect(previews).toContainText('careers.example.com');
    await expect(previews).not.toContainText('Unverified page');
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.evaluate(() => document.documentElement.classList.remove('dark'));
    await window.screenshot({ path: testInfo.outputPath('agent-read-light.png') });
    await window.evaluate(() => document.documentElement.classList.add('dark'));
    await window.screenshot({ path: testInfo.outputPath('agent-read-dark.png') });

    // The read was stored: a re-paste is answered from the database and never starts a second agent run.
    const again = await window.evaluate((url) => window.jobpilot!.postings.ingest(url), `${jobUrl}?utm_source=mail`);
    expect(again).toMatchObject({ ok: true, posting: { source: 'agent', verified: true } });
    const state = await app.evaluate(async ({ app }) => {
      const path = process.getBuiltinModule('node:path')!;
      const nodeRequire = process
        .getBuiltinModule('node:module')!
        .createRequire(path.join(app.getAppPath(), 'package.json'));
      const main = nodeRequire(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
      return {
        reads: main.fakeAgent!.history.length,
        allowlist: main.fakeAgent!.history[0]?.toolAllowlist,
        tabs: main.fakeBrowser!.tabs.size,
        rows: main.db.$client.prepare('SELECT source, verified FROM job_posting').all(),
      };
    });
    expect(state).toEqual({
      reads: 1,
      allowlist: { browser: ['snapshot', 'click', 'scroll'] },
      tabs: 0,
      rows: [{ source: 'agent', verified: 1 }],
    });
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
