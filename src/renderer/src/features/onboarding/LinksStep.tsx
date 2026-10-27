import { GoButton } from '../shared-ui';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';

export function LinksStep() {
  return (
    <OnboardingFrame step={3} minHeight={682}>
      <StepHeading
        eyebrow="Step 3 of 5"
        lead="Choose jobs"
        tail="you want."
        lede="Use Add jobs on the dashboard to preview and save real job links. No jobs have been queued during setup."
      />
      <div className="flex gap-4">
        <GoButton to="/profile">Open Profile</GoButton>
        <GoButton to="/welcome/4" variant="primary">
          Continue
        </GoButton>
      </div>
    </OnboardingFrame>
  );
}
