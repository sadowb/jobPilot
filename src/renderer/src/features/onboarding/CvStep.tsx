import { GoButton } from '../shared-ui';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';

export function CvStep() {
  return (
    <OnboardingFrame step={2} minHeight={682}>
      <StepHeading
        eyebrow="Step 2 of 5"
        lead="Add your CV"
        tail="when you’re ready."
        lede="Upload your real documents from Profile. No CV has been imported yet."
      />
      <div className="flex gap-4">
        <GoButton to="/profile">Open Profile</GoButton>
        <GoButton to="/welcome/3" variant="primary">
          Continue
        </GoButton>
      </div>
    </OnboardingFrame>
  );
}
