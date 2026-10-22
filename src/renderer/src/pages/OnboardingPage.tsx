import { Navigate, useParams } from 'react-router-dom';
import { CvStep } from '../features/onboarding/CvStep';
import { FactsStep } from '../features/onboarding/FactsStep';
import { LiftoffStep } from '../features/onboarding/LiftoffStep';
import { LinksStep } from '../features/onboarding/LinksStep';
import { WelcomeStep } from '../features/onboarding/WelcomeStep';
import { parseStep, stepPath } from '../features/onboarding/steps';
import { useTheme } from '../lib/theme';

const STEP_VIEWS = { 1: WelcomeStep, 2: CvStep, 3: LinksStep, 4: FactsStep, 5: LiftoffStep } as const;

/** Full-screen setup (/welcome/1..5): no pill nav, the progress dots take its place. */
export function OnboardingPage() {
  useTheme();
  const step = parseStep(useParams().step);
  if (step === null) return <Navigate to={stepPath(1)} replace />;
  const View = STEP_VIEWS[step];
  return (
    <div className="relative min-h-full bg-ground font-sans text-[15px] leading-[1.45] text-ink antialiased">
      <View />
    </div>
  );
}
