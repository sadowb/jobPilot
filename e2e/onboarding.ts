import { expect, type Page } from '@playwright/test';

export async function skipOnboarding(window: Page): Promise<void> {
  await expect(
    window.getByRole('navigation', { name: 'Main' }).or(window.getByRole('button', { name: 'Skip for now' })),
  ).toBeVisible();
  if (await window.getByRole('button', { name: 'Skip for now' }).isVisible())
    await window.getByRole('button', { name: 'Skip for now' }).click();
}

/** Fake-provider journeys only: gives the fake agent and browser the owner's Allow, the way P1 would. */
export async function allowFakeConnections(window: Page): Promise<void> {
  const result = await window.evaluate(() =>
    window.jobpilot!.onboarding.allow({ agent: { id: 'claude', model: null }, browser: { id: 'neo' } }),
  );
  expect(result).toMatchObject({ agent: { ok: true }, browser: { ok: true } });
}
