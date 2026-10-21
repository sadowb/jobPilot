export const ONBOARDING_STEPS = [1, 2, 3, 4, 5] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Parses the `:step` route param; anything outside 1..5 is rejected so the page can redirect. */
export function parseStep(raw: string | undefined): OnboardingStep | null {
  if (raw === undefined || !/^[1-5]$/.test(raw)) return null;
  return Number(raw) as OnboardingStep;
}

export const stepPath = (step: OnboardingStep) => `/welcome/${step}`;

/** Where "continue" goes: the next step, or the dashboard after the last one. */
export function nextPath(step: OnboardingStep): string {
  return step === 5 ? '/' : stepPath((step + 1) as OnboardingStep);
}

/** Progress dot width/colour per step: done = small brand dot, current = 28px brand pill, ahead = small neutral dot. */
export function dotState(index: OnboardingStep, current: OnboardingStep): 'done' | 'current' | 'ahead' {
  if (index < current) return 'done';
  return index === current ? 'current' : 'ahead';
}
