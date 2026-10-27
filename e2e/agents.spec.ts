import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { skipOnboarding } from './onboarding';

type Main = typeof import('../src/main/app/main');

// eslint-disable-next-line no-empty-pattern
test('owner confirms installed Claude, selects a persistent model, and sees login failures in Settings', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-agents-'));
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
    const window = await app.firstWindow();
    await skipOnboarding(window);
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await window.evaluate(() => {
      location.hash = '#/settings';
    });
    await expect(window.getByTestId('agent-status')).not.toContainText('Detecting');
    return window;
  }
  async function runFixture(prompt: string) {
    return app!.evaluate(
      async ({ app }, input) => {
        const path = process.getBuiltinModule('node:path')!;
        const require = process
          .getBuiltinModule('node:module')!
          .createRequire(path.join(app.getAppPath(), 'package.json'));
        const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
        const run = main.agentSettings.run({
          runId: 'fixture',
          prompt: input.prompt,
          mcpServers: { form: { type: 'stdio', command: input.node, args: [input.mcp] } },
          outputSchema: main.RunResultSchema,
          signal: new AbortController().signal,
          timeoutMs: 10_000,
        });
        if (input.prompt === 'wait') {
          return new Promise<{ events: never[]; status: string }>((resolve) => {
            void (async () => {
              for await (const event of run.events) {
                if (event.type === 'message' && event.text.startsWith('model:'))
                  resolve({ events: [], status: 'waiting' });
              }
              await run.result;
            })().catch(() => resolve({ events: [], status: 'rejected' }));
          });
        }
        const events = [];
        for await (const event of run.events) events.push(event);
        try {
          return { events, status: (await run.result).status };
        } catch (error) {
          return { events, status: 'rejected', error: error instanceof Error ? error.message : 'unknown' };
        }
      },
      { prompt, node: process.execPath, mcp: resolve('scripts/fixtures/claude/stub-mcp.mjs') },
    );
  }
  try {
    let window = await launch();
    if (packaged) {
      const bundled = await app!.evaluate(({ app }) => {
        const fs = process.getBuiltinModule('node:fs')!;
        const path = process.getBuiltinModule('node:path')!;
        return fs.readdirSync(path.join(app.getAppPath(), 'node_modules/@anthropic-ai'));
      });
      expect(bundled.filter((name) => name.startsWith('claude-agent-sdk-'))).toEqual([]);
    }

    const card = () => window.getByRole('region', { name: 'Agent settings' });
    await window.setViewportSize({ width: 1280, height: 800 });
    await card().screenshot({ path: testInfo.outputPath('agent-card-first-run.png'), animations: 'disabled' });
    await expect(window.getByLabel('Agent model', { exact: true })).toHaveValue('haiku');
    await expect(window.getByLabel('Agent authentication')).toHaveValue('login');
    await expect(window.getByLabel('Crew size')).toHaveValue('6');
    expect(
      await window.evaluate(async () => {
        try {
          await window.jobpilot!.agent.save({ path: 'relative', model: 'haiku', auth: 'login' });
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    await window.getByLabel('Claude executable path', { exact: true }).fill(join(userData, 'missing'));
    await card().getByRole('button', { name: 'Save', exact: true }).click();
    await expect(card().getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await expect(card().getByRole('status')).toContainText('not a working copy of Claude');
    const removable = join(userData, 'removable-claude');
    writeFileSync(removable, '#!/bin/sh\nprintf "fixture version\\n"\n', { mode: 0o700 });
    await window.getByLabel('Claude executable path', { exact: true }).fill(removable);
    await window.getByLabel('Agent authentication').selectOption('login');
    await card().getByRole('button', { name: 'Save', exact: true }).click();
    await expect(card().getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await expect(window.getByTestId('agent-status')).toHaveText('Ready');
    unlinkSync(removable);
    expect((await window.evaluate(() => window.jobpilot!.agent.get())).status).toBe('tool_not_installed');

    await window
      .getByLabel('Claude executable path', { exact: true })
      .fill(resolve('scripts/fixtures/claude/fake-claude'));
    await window.getByLabel('Agent authentication').selectOption('login');
    await card().getByRole('button', { name: 'Save', exact: true }).click();
    await expect(card().getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await expect(window.getByTestId('agent-status')).toHaveText('Ready');
    await card().screenshot({ path: testInfo.outputPath('agent-card-ready.png'), animations: 'disabled' });
    const first = await runFixture('Fill the local form');
    expect(first.status, JSON.stringify(first)).toBe('filled');
    expect(first.events).toContainEqual({ type: 'message', role: 'assistant', text: 'model:haiku' });
    await window.getByLabel('Agent model', { exact: true }).selectOption('sonnet');
    await card().getByRole('button', { name: 'Save', exact: true }).click();
    await expect(card().getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await expect(card().getByRole('status')).toHaveText('Saved.');
    await app!.close();
    window = await launch();
    await expect(window.getByLabel('Agent model', { exact: true })).toHaveValue('sonnet');
    await expect(window.getByLabel('Claude executable path', { exact: true })).toHaveValue(
      resolve('scripts/fixtures/claude/fake-claude'),
    );
    const second = await runFixture('Fill the local form');
    expect(second.status, JSON.stringify(second)).toBe('filled');
    expect(second.events).toContainEqual({ type: 'message', role: 'assistant', text: 'model:sonnet' });
    const failed = await runFixture('not-logged-in');
    expect(failed.status).toBe('rejected');
    expect((await window.evaluate(() => window.jobpilot!.agent.get())).status).toBe('not_logged_in');
    await window.evaluate(() => {
      location.hash = '#/';
    });
    await window.evaluate(() => {
      location.hash = '#/settings';
    });
    await expect(window.getByTestId('agent-status')).toHaveText('Sign in needed');
    await expect(card().getByText('Open Terminal and run claude once to sign in.')).toBeVisible();
    await window.setViewportSize({ width: 1280, height: 800 });
    for (const theme of ['light', 'dark'] as const) {
      await window.evaluate(async (source) => {
        await window.jobpilot!.theme.set(source);
      }, theme);
      if (theme === 'dark') await expect(window.locator('html')).toHaveClass(/dark/);
      else await expect(window.locator('html')).not.toHaveClass(/dark/);
      await window.screenshot({ path: testInfo.outputPath(`settings-agent-${theme}.png`), animations: 'disabled' });
    }
    await card().getByRole('button', { name: 'Find again' }).click();
    await expect(card().getByRole('status')).toHaveText('Save once before starting a run.');
    await window
      .getByLabel('Claude executable path', { exact: true })
      .fill(resolve('scripts/fixtures/claude/fake-claude'));
    await card().getByRole('button', { name: 'Save', exact: true }).click();
    await expect(card().getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await expect(window.getByTestId('agent-status')).toHaveText('Ready');
    expect((await runFixture('wait')).status).toBe('waiting');
    const pids = ['child.pid', 'descendant.pid'].map((file) =>
      Number(readFileSync(join(userData, 'agents/claude/fixture', file), 'utf8')),
    );
    await app!.close();
    app = undefined;
    for (const pid of pids) {
      await expect
        .poll(() => {
          try {
            process.kill(pid, 0);
            return true;
          } catch {
            return false;
          }
        })
        .toBe(false);
    }
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
