import { GoButton } from '../shared-ui';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';

export function LinksStep() {
  return (
    <OnboardingFrame step={3} minHeight={682}>
      <StepHeading
        eyebrow="Step 3 · Your jobs"
        lead="Add jobs"
        tail="later."
        lede="Use Add jobs on the dashboard to preview and save real job links. No jobs have been added during setup."
      />
      <div className="flex gap-4">
        <GoButton to="/welcome/4" variant="primary">
          Continue
        </GoButton>
      </div>
    </OnboardingFrame>
  );
}
