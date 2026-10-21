import type { ReactNode } from 'react';
import { NavButton } from '../../components/NavButton';
import { Logo } from '../../components/Logo';
import '../../styles/motion.css';
import '../../styles/v17-surfaces.css';
import { ONBOARDING_STEPS, dotState, type OnboardingStep } from './steps';

const dotStyle = (state: ReturnType<typeof dotState>) => ({
  display: 'block',
  height: 8,
  borderRadius: 99,
  width: state === 'current' ? 28 : 8,
  background: state === 'ahead' ? 'var(--line-2)' : 'var(--brand)',
});

/** Header (logo, 5-dot progress, skip) plus the `.v17` content area every onboarding step sits in. */
export function OnboardingFrame({
  step,
  minHeight,
  children,
}: {
  step: OnboardingStep;
  /** Content height at the board's size (board height minus the 78px header). */
  minHeight: number;
  children: ReactNode;
}) {
  return (
    <>
      <header
        className="top"
        style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '22px 56px' }}
      >
        <Logo label="JobPilot, setup" />
        <div className="row nw" style={{ gap: 8, justifySelf: 'center' }} role="img" aria-label={`Step ${step} of 5`}>
          {ONBOARDING_STEPS.map((i) => (
            <i key={i} style={dotStyle(dotState(i, step))} />
          ))}
          <span className="spec" style={{ marginLeft: 10, color: 'var(--muted)' }}>
            {step} / 5
          </span>
        </div>
        <div style={{ justifySelf: 'end' }}>
          <NavButton className="btn ghost sm" to="/">
            Skip for now
          </NavButton>
        </div>
      </header>
      <div
        className="v17"
        style={{
          boxSizing: 'border-box',
          minHeight,
          padding: '8px 56px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {children}
      </div>
    </>
  );
}

/** Eyebrow, 56px headline (serif tail in italics) and lede shared by steps 2 to 5. */
export function StepHeading({
  eyebrow,
  lead,
  tail,
  lede,
}: {
  eyebrow: string;
  lead: string;
  tail: string;
  lede: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="h1" style={{ fontSize: 56, lineHeight: 1.04, margin: 0 }}>
        {lead} <span className="it">{tail}</span>
      </h1>
      <p className="mut" style={{ margin: 0, fontSize: 17, lineHeight: 1.5, maxWidth: 760 }}>
        {lede}
      </p>
    </div>
  );
}
