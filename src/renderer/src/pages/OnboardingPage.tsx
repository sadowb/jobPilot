import { Navigate, useParams } from 'react-router-dom';
import { AboutStep } from '../features/onboarding/AboutStep';
import { ConnectStep } from '../features/onboarding/ConnectStep';
import { TakeoffStep } from '../features/onboarding/TakeoffStep';
import { parseStep, stepPath } from '../features/onboarding/steps';
import { useTheme } from '../lib/theme';

const STEP_VIEWS = { 1: ConnectStep, 2: AboutStep, 3: TakeoffStep } as const;

/** Full-screen setup (/welcome/1..3): no pill nav; the flight-path header takes its place. */
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
