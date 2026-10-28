import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { skipOnboarding } from './onboarding';

/** Bottom edge of the first visible element with this accessible name, in CSS px. */
async function bottomOf(window: Page, role: 'button', name: string | RegExp) {
  const box = await window.getByRole(role, { name, exact: true }).first().boundingBox();
  expect(box, `${String(name)} is rendered`).not.toBeNull();
  return box!.y + box!.height;
}

// eslint-disable-next-line no-empty-pattern
test('Profile primary action fits a short window without scrolling', async ({}, testInfo) => {
  test.setTimeout(90_000);
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-fit-'));
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
      timeout: 60_000,
    });
    const window = await app.firstWindow();
    await skipOnboarding(window);
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();

    // #114: "Add a CV" sits above the fold even at a short 1100x700 window.
    await window.setViewportSize({ width: 1100, height: 700 });
    await window.evaluate(() => {
      location.hash = '#/profile';
    });
    expect(await bottomOf(window, 'button', 'Add a CV')).toBeLessThanOrEqual(700);
    for (const theme of ['light', 'dark'] as const) {
      await window.evaluate(async (source) => {
        await window.jobpilot!.theme.set(source);
      }, theme);
      await window.screenshot({ path: testInfo.outputPath(`profile-1100x700-${theme}.png`), animations: 'disabled' });
    }
    // #113 (Fixes cards) no longer applies: #80 replaced the Fixes screen with Coming soon.
  } finally {
    await app?.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
