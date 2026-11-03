export const ONBOARDING_STEPS = [1, 2, 3] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Parses the `:step` route param; anything outside 1..3 is rejected so the page can redirect. */
export function parseStep(raw: string | undefined): OnboardingStep | null {
  if (raw === undefined || !/^[1-3]$/.test(raw)) return null;
  return Number(raw) as OnboardingStep;
}

export const stepPath = (step: OnboardingStep) => `/welcome/${step}`;

export const STEP_NAMES: Record<OnboardingStep, string> = { 1: 'Connect', 2: 'About you', 3: 'Ready' };
