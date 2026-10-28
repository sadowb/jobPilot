import type { ReactNode } from 'react';
import { AppearanceControl } from '../../components/AppearanceControl';
import { CapDartArt } from '../../components/CapDartArt';
import { Logo } from '../../components/Logo';
import { Eyebrow, cn } from '../../components/ui';
import { hostPlatform } from '../../lib/api';
import { A_BOB, BUBBLE, GoButton, H1, IT, REDUCE_ALL, S, SPEC } from '../shared-ui';
import { saveProfileData } from '../profile/profileStorage';
import { ONBOARDING_STEPS, STEP_NAMES, dotState, stepPath, type OnboardingStep } from './steps';

/**
 * Setup header. On macOS it becomes the sticky, draggable toolbar strip behind the native window controls
 * (80px spacer in column 1, progress in column 2, actions in column 3); everywhere else it is a plain 3-column grid.
 */
const HEADER = cn(
  'grid grid-cols-[1fr_auto_1fr] items-center gap-6 bg-transparent px-14 py-[22px]',
  'in-[html[data-platform=darwin]]:sticky in-[html[data-platform=darwin]]:top-0 in-[html[data-platform=darwin]]:z-1 in-[html[data-platform=darwin]]:h-(--app-toolbar-height) in-[html[data-platform=darwin]]:min-h-(--app-toolbar-height) in-[html[data-platform=darwin]]:gap-4 in-[html[data-platform=darwin]]:bg-ground in-[html[data-platform=darwin]]:px-6 in-[html[data-platform=darwin]]:py-1.5',
  'in-[html[data-platform=darwin]]:[-webkit-app-region:drag] in-[html[data-platform=darwin]]:[app-region:drag] in-[html[data-platform=darwin]]:select-none',
  "in-[html[data-platform=darwin]]:before:col-start-1 in-[html[data-platform=darwin]]:before:row-start-1 in-[html[data-platform=darwin]]:before:h-8 in-[html[data-platform=darwin]]:before:w-20 in-[html[data-platform=darwin]]:before:content-['']",
  'in-[html[data-platform=darwin]]:[&_:is(a,button,input,select,textarea,[role=button],[role=radio])]:[-webkit-app-region:no-drag] in-[html[data-platform=darwin]]:[&_:is(a,button,input,select,textarea,[role=button],[role=radio])]:[app-region:no-drag] [&_.appearance-button]:text-ink!',
);
const PLACE_COL_2 = 'in-[html[data-platform=darwin]]:[grid-column:2] in-[html[data-platform=darwin]]:[grid-row:1]';
const PLACE_COL_3 = 'in-[html[data-platform=darwin]]:[grid-column:3] in-[html[data-platform=darwin]]:[grid-row:1]';

/** Header (logo, 5-dot progress, skip) plus the content area every onboarding step sits in. */
export function OnboardingFrame({
  step,
  minHeight,
  aside,
  children,
}: {
  step: OnboardingStep;
  /** Content height at the board's size (board height minus the 78px header). */
  minHeight: number;
  /** Right-hand column from step 2 on (V17 boards); defaults to the Cap panel. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className={HEADER}>
        {hostPlatform() !== 'darwin' && <Logo label="JobPilot, setup" />}
        <div
          className={cn('flex items-center gap-2 justify-self-center', PLACE_COL_2)}
          role="img"
          aria-label={`Step ${step} of 5`}
        >
          {ONBOARDING_STEPS.map((i) => {
            const state = dotState(i, step);
            return (
              <i
                key={i}
                className={cn(
                  'block h-2 rounded-full',
                  state === 'current' ? 'w-7' : 'w-2',
                  state === 'ahead' ? 'bg-line-2' : 'bg-brand',
                )}
              />
            );
          })}
          <span className={cn(SPEC, 'ml-2.5 text-muted tracking-[0.02em]!')}>
            Step {step} of 5 · {STEP_NAMES[step]}
          </span>
        </div>
        <div className={cn('flex items-center gap-2 justify-self-end', PLACE_COL_3)}>
          <AppearanceControl />
          {/* `.btn.ghost` never had a hover fill, unlike the primitive's ghost variant. */}
          {/* Skipping is a choice, not a crash: don't show onboarding again on the next launch (#135). */}
          <GoButton
            to="/"
            onClick={() => void saveProfileData('onboardingCompletedAt', Date.now())}
            variant="ghost"
            size="sm"
            className="hover:bg-transparent! text-ink-2! font-semibold! text-[13.5px]! in-[html[data-platform=darwin]]:h-8 in-[html[data-platform=darwin]]:min-h-8"
          >
            Skip for now
          </GoButton>
        </div>
      </header>
      <div
        className={cn('flex flex-col gap-5 px-14 pt-2 pb-8', REDUCE_ALL)}
        // The minimum height is a per-step prop (the board's content height).
        style={{ minHeight }}
      >
        {step > 1 && (
          <GoButton
            to={stepPath((step - 1) as OnboardingStep)}
            variant="ghost"
            size="sm"
            className="-mb-3 -ml-3.5 self-start text-ink-2!"
          >
            ← Back
          </GoButton>
        )}
        {step === 1 ? (
          children
        ) : (
          <div className="grid min-w-0 grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-start gap-10">
            <div className="flex min-w-0 flex-col gap-6">{children}</div>
            {aside ?? <CapPanel note="Ready when you are." />}
          </div>
        )}
      </div>
    </>
  );
}

const PANEL =
  'rounded-[28px] border border-line [background:radial-gradient(circle_at_80%_18%,var(--brand-tint),transparent_55%),var(--panel)]';

/** Right-hand column shell: the V17 panel surface around `children`. */
export function AsidePanel({ children, className }: { children: ReactNode; className?: string }) {
  return <aside className={cn(PANEL, 'min-w-0 p-6', className)}>{children}</aside>;
}

/** Cap on the dart with a one-line bubble, for steps whose right column has nothing of its own to show. */
export function CapPanel({ note }: { note: string }) {
  return (
    <AsidePanel className="flex h-[420px] flex-col items-center justify-center gap-4">
      <div className={cn('size-[220px]', A_BOB)}>
        <CapDartArt size={220} gust />
      </div>
      <div className={cn(BUBBLE, 'px-4 py-3 text-[15px]')}>{note}</div>
    </AsidePanel>
  );
}

/** Eyebrow, 44px headline (serif tail in italics) and lede shared by steps 2 to 5. */
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
    <div className="flex flex-col gap-2.5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className={cn(H1, 'text-[44px] leading-[1.06]')}>
        {lead} <span className={IT}>{tail}</span>
      </h1>
      <p className={cn(S, 'm-0 max-w-[620px] text-[16px] leading-normal')}>{lede}</p>
    </div>
  );
}
