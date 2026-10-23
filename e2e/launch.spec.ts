import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Temp userData keeps the owner's real DB and settings untouched.
test('launches the built app, toggles theme, navigates routes, reports DB state', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-e2e-'));
  const rendererErrors: string[] = [];
  const mainStderr: string[] = [];
  const app: ElectronApplication = await electron.launch({ args: ['.', `--user-data-dir=${userData}`] });
  try {
    app.process().stderr?.on('data', (chunk: Buffer) => mainStderr.push(chunk.toString()));
    const window: Page = await app.firstWindow();
    window.on('console', (msg) => {
      if (msg.type() === 'error') rendererErrors.push(msg.text());
    });
    window.on('pageerror', (error) => rendererErrors.push(error.message));
    await window.waitForLoadState('domcontentloaded');

    await test.step('first window renders the shell with no console errors', async () => {
      await expect.soft(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
      expect.soft(rendererErrors).toEqual([]);
    });

    await test.step('preload bridge is exposed', async () => {
      expect.soft(await window.evaluate(() => typeof window.jobpilot)).toBe('object');
    });

    await test.step('theme toggle switches the dark class and back (typed IPC + zod)', async () => {
      const isDark = () => window.evaluate(() => document.documentElement.classList.contains('dark'));
      const toggle = window.getByRole('button', { name: /Switch to (dark|light) mode/ });
      const startDark = await isDark();
      await toggle.click();
      await expect.poll(isDark).toBe(!startDark);
      await toggle.click();
      await expect.poll(isDark).toBe(startDark);
    });

    for (const route of ['#/profile', '#/settings', '#/']) {
      await test.step(`navigates to ${route}`, async () => {
        await window.evaluate((hash) => {
          location.hash = hash;
        }, route);
        await expect.poll(() => window.evaluate(() => location.hash)).toBe(route);
        await expect(window.locator('#root')).not.toBeEmpty();
      });
    }

    await test.step('no renderer or main-process errors after navigation', async () => {
      expect.soft(rendererErrors).toEqual([]);
      // macOS CI runners log Chromium helper XPC noise (com.apple.backupd); it is not from the app.
      const appStderr = mainStderr
        .join('')
        .split('\n')
        .filter((line) => !/XPC error for connection/.test(line));
      expect.soft(appStderr.join('\n')).not.toMatch(/error/i);
    });

    await test.step('encrypted DB file exists after launch', async () => {
      const dbFiles = readdirSync(userData).filter((name) => name.endsWith('.db') || name.endsWith('.sqlite'));
      expect(dbFiles).toContain('jobpilot.db');
      expect(readFileSync(join(userData, 'jobpilot.db')).subarray(0, 15).toString()).not.toBe('SQLite format 3');
      test.info().annotations.push({ type: 'db', description: dbFiles.length ? dbFiles.join(', ') : 'none' });
    });
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
