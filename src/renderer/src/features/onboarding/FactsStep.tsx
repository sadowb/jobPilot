import { GoButton } from '../shared-ui';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';

export function FactsStep() {
  return (
    <OnboardingFrame step={4} minHeight={682}>
      <StepHeading
        eyebrow="Step 4 of 5"
        lead="Your profile,"
        tail="your answers."
        lede="Enter your details and common answers in Profile. JobPilot starts with no personal facts."
      />
      <div className="flex gap-4">
        <GoButton to="/profile">Open Profile</GoButton>
        <GoButton to="/welcome/5" variant="primary">
          Continue
        </GoButton>
      </div>
    </OnboardingFrame>
  );
}
