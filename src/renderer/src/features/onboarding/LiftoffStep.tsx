import { GoButton } from '../shared-ui';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';

export function LiftoffStep() {
  return (
    <OnboardingFrame step={5} minHeight={682}>
      <StepHeading
        eyebrow="Step 5 of 5"
        lead="Ready for"
        tail="your first job."
        lede="Open Profile to add your details, or paste a job link on the dashboard. Nothing has been applied to yet."
      />
      <div className="flex gap-4">
        <GoButton to="/profile">Open Profile</GoButton>
        <GoButton to="/" variant="primary">
          Open dashboard
        </GoButton>
      </div>
    </OnboardingFrame>
  );
}
