import { skipOnboarding } from './onboarding';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Main = typeof import('../src/main/app/main');

// eslint-disable-next-line no-empty-pattern
test('Claude key persists encrypted, stays write-only, tests in main, and can be removed', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-secrets-'));
  const key = 'sk-ant-api03-fake-journey-only-ABCD';
  const diagnostics: string[] = [];
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
  async function launch() {
    app = await electron.launch(options);
    app.process().stderr?.on('data', (chunk: Buffer) => diagnostics.push(chunk.toString()));
    const window = await app.firstWindow();
    await skipOnboarding(window);
    window.on('console', (message) => diagnostics.push(message.text()));
    window.on('pageerror', (error) => diagnostics.push(error.message));
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await window.evaluate(() => {
      location.hash = '#/settings';
    });
    await expect(window.getByTestId('claude-key-status')).not.toHaveText('Status unavailable');
    return window;
  }
  try {
    let window = await launch();
    const section = () => window.getByRole('region', { name: 'Claude API key settings' });
    await expect(section().getByTestId('claude-key-status')).toHaveText('No key saved');
    await section().getByText('Use an API key instead (optional)').click();
    await expect(window.getByLabel('Claude API key (optional)', { exact: true })).toHaveAccessibleDescription(
      "JobPilot uses the Claude you're signed into on this Mac. Add a key only to use API billing instead.",
    );
    expect(await window.evaluate(() => window.jobpilot!.claudeKey.test())).toBe('not_set');
    await window.getByLabel('Claude API key (optional)', { exact: true }).fill(key);
    await section().getByRole('button', { name: 'Save key' }).click();
    await expect(section().getByRole('status')).toHaveText('Claude API key saved.');
    await expect(window.getByLabel('Claude API key (optional)', { exact: true })).toHaveValue('');
    expect(await window.evaluate(() => window.jobpilot!.claudeKey.status())).toEqual({ set: true, last4: 'ABCD' });

    expect(
      await app!.evaluate(async ({ app }, expected) => {
        const path = process.getBuiltinModule('node:path')!;
        const require = process
          .getBuiltinModule('node:module')!
          .createRequire(path.join(app.getAppPath(), 'package.json'));
        const { db } = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
        const { safeStorage } = require('electron') as typeof import('electron');
        const row = db.$client.prepare('SELECT value FROM settings WHERE key = ?').get('secrets.anthropic') as {
          value: string;
        };
        const encrypted = JSON.parse(row.value) as string;
        return (
          !row.value.includes(expected) &&
          (await safeStorage.decryptStringAsync(Buffer.from(encrypted, 'base64'))).result === expected
        );
      }, key),
    ).toBe(true);

    await app!.close();
    window = await launch();
    await expect(section().getByTestId('claude-key-status')).toHaveText('Saved · ••••ABCD');
    await expect(window.getByLabel('Claude API key (optional)', { exact: true })).toHaveValue('');
    expect(
      await window.evaluate(() => ({
        bridge: Object.keys(window.jobpilot!.claudeKey),
        storage: JSON.stringify([localStorage, sessionStorage]),
        html: document.body.innerHTML,
      })),
    ).toEqual(
      expect.objectContaining({
        bridge: ['set', 'status', 'remove', 'test'],
        storage: expect.not.stringContaining(key),
        html: expect.not.stringContaining(key),
      }),
    );

    await app!.evaluate(({ app }, expected) => {
      const original = globalThis.fetch;
      let calls = 0;
      globalThis.fetch = (async (url, init) => {
        calls++;
        if (
          url !== 'https://api.anthropic.com/v1/models?limit=1' ||
          init?.method !== 'GET' ||
          (init.headers as Record<string, string>)['x-api-key'] !== expected ||
          (init.headers as Record<string, string>)['anthropic-version'] !== '2023-06-01' ||
          init.body !== undefined ||
          init.redirect !== 'error' ||
          !init.signal
        )
          throw new Error('Unexpected request');
        if (calls === 1) return new Response(JSON.stringify({ data: [{ type: 'model', id: 'available-model' }] }));
        if (calls <= 6) {
          return new Response(JSON.stringify({ error: expected }), { status: [401, 403, 429, 500, 503][calls - 2] });
        }
        if (calls === 7) return new Response(JSON.stringify({ unexpected: expected }));
        if (calls === 8) return new Response('invalid JSON');
        if (calls === 9) throw new TypeError(expected);
        throw new DOMException(expected, 'TimeoutError');
      }) as typeof fetch;
      (globalThis as typeof globalThis & { finishClaudeTest: () => number }).finishClaudeTest = () => {
        globalThis.fetch = original;
        return calls;
      };
      void app;
    }, key);
    await section().getByRole('button', { name: 'Test', exact: true }).click();
    await expect(section().getByRole('status')).toHaveText('Claude API key works.');
    for (let i = 0; i < 2; i++) {
      await section().getByRole('button', { name: 'Test', exact: true }).click();
      await expect(section().getByRole('status')).toHaveText(
        'This key was rejected. Check it in the Anthropic Console.',
      );
    }
    for (let i = 0; i < 7; i++) {
      await section().getByRole('button', { name: 'Test', exact: true }).click();
      await expect(section().getByRole('status')).toHaveText(
        "Couldn't reach Anthropic. Check your connection and try again.",
      );
    }
    expect(
      await app!.evaluate(() =>
        (globalThis as typeof globalThis & { finishClaudeTest: () => number }).finishClaudeTest(),
      ),
    ).toBe(10);

    expect(
      await window.evaluate(async () => {
        try {
          await window.jobpilot!.claudeKey.set('invalid');
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    expect(await window.evaluate(() => window.jobpilot!.claudeKey.status())).toEqual({ set: true, last4: 'ABCD' });

    expect(
      await app!.evaluate(async ({ app }) => {
        const path = process.getBuiltinModule('node:path')!;
        const require = process
          .getBuiltinModule('node:module')!
          .createRequire(path.join(app.getAppPath(), 'package.json'));
        const { BrowserWindow } = require('electron') as typeof import('electron');
        const untrusted = new BrowserWindow({
          show: false,
          webPreferences: {
            preload: path.join(app.getAppPath(), 'out/preload/index.js'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
          },
        });
        try {
          await untrusted.loadURL('about:blank');
          return await untrusted.webContents.executeJavaScript(`Promise.all([
          () => window.jobpilot.claudeKey.set('sk-ant-untrusted-key'),
          () => window.jobpilot.claudeKey.status(),
          () => window.jobpilot.claudeKey.remove(),
          () => window.jobpilot.claudeKey.test()
        ].map(async action => { try { await action(); return false; } catch (error) { return error.message.includes('untrusted sender'); } }))`);
        } finally {
          untrusted.destroy();
        }
      }),
    ).toEqual([true, true, true, true]);

    await section().getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(section().getByTestId('claude-key-status')).toHaveText('No key saved');
    await app!.close();
    window = await launch();
    await expect(section().getByTestId('claude-key-status')).toHaveText('No key saved');
    await app!.close();
    app = undefined;
    const logs = readdirSync(join(userData, 'logs'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'))
      .join('\n');
    expect(logs + diagnostics.join('\n')).not.toContain(key);
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
