import { expect, type Page } from '@playwright/test';

export async function skipOnboarding(window: Page): Promise<void> {
  await expect(
    window.getByRole('navigation', { name: 'Main' }).or(window.getByRole('button', { name: 'Skip for now' })),
  ).toBeVisible();
  if (await window.getByRole('button', { name: 'Skip for now' }).isVisible())
    await window.getByRole('button', { name: 'Skip for now' }).click();
}
