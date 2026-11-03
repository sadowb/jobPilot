import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppearanceControl } from '../../components/AppearanceControl';
import { Logo } from '../../components/Logo';
import { cn } from '../../components/ui';
import { hostPlatform } from '../../lib/api';
import { saveProfileData } from '../profile/profileStorage';
import { GoButton } from '../shared-ui';
import { ONBOARDING_STEPS, STEP_NAMES, type OnboardingStep } from './steps';

/**
 * Setup header. On macOS it becomes the sticky, draggable toolbar strip behind the native window controls
 * (80px spacer in column 1, progress in column 2, actions in column 3); everywhere else it is a plain 3-column grid.
 */
const HEADER = cn(
  'grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-line bg-transparent px-14 py-[14px]',
  'in-[html[data-platform=darwin]]:sticky in-[html[data-platform=darwin]]:top-0 in-[html[data-platform=darwin]]:z-1 in-[html[data-platform=darwin]]:h-(--app-toolbar-height) in-[html[data-platform=darwin]]:min-h-(--app-toolbar-height) in-[html[data-platform=darwin]]:gap-4 in-[html[data-platform=darwin]]:bg-ground in-[html[data-platform=darwin]]:px-6 in-[html[data-platform=darwin]]:py-1.5',
  'in-[html[data-platform=darwin]]:[-webkit-app-region:drag] in-[html[data-platform=darwin]]:[app-region:drag] in-[html[data-platform=darwin]]:select-none',
  "in-[html[data-platform=darwin]]:before:col-start-1 in-[html[data-platform=darwin]]:before:row-start-1 in-[html[data-platform=darwin]]:before:h-8 in-[html[data-platform=darwin]]:before:w-20 in-[html[data-platform=darwin]]:before:content-['']",
  'in-[html[data-platform=darwin]]:[&_:is(a,button,input,select,textarea,[role=button],[role=radio])]:[-webkit-app-region:no-drag] in-[html[data-platform=darwin]]:[&_:is(a,button,input,select,textarea,[role=button],[role=radio])]:[app-region:no-drag]',
);
const PLACE_COL_2 = 'in-[html[data-platform=darwin]]:[grid-column:2] in-[html[data-platform=darwin]]:[grid-row:1]';
const PLACE_COL_3 = 'in-[html[data-platform=darwin]]:[grid-column:3] in-[html[data-platform=darwin]]:[grid-row:1]';

const PLANE = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 11.5 21 3l-6.5 18-3.2-7.3z" className="fill-brand" />
  </svg>
);

/** One dashed leg between two waypoints. The leg after the current step is empty, the one before it is full, the live one flies. */
function Leg({ state }: { state: 'done' | 'live' | 'ahead' }) {
  return (
    <span className="relative h-0.5 w-14 bg-[repeating-linear-gradient(90deg,var(--line-2)_0_4px,transparent_4px_8px)]">
      {state !== 'ahead' && (
        <span
          className={cn(
            'absolute top-0 left-0 h-0.5 bg-brand',
            state === 'done' ? 'w-14' : 'w-14 animate-ob-flight motion-reduce:animate-none',
          )}
        >
          {state === 'live' && (
            <span className="absolute -top-[7px] -right-[9px] animate-jp-bob motion-reduce:animate-none">{PLANE}</span>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * Logo, flight-path progress ("1 Connect — 2 About you — 3 Ready") and skip. Skipping is a choice, not a crash:
 * completion is saved first so setup does not return on the next launch (#135).
 */
export function OnboardingHeader({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate();
  const [skipError, setSkipError] = useState(false);
  const skip = async () => {
    setSkipError(false);
    try {
      await saveProfileData('onboardingCompletedAt', Date.now());
      void navigate('/');
    } catch {
      setSkipError(true);
    }
  };
  return (
    <>
      <header className={HEADER}>
        {hostPlatform() !== 'darwin' && <Logo label="JobPilot, setup" />}
        <nav
          aria-label="Setup progress"
          className={cn(
            'flex items-center gap-3.5 justify-self-center font-mono text-[12.5px] font-medium',
            PLACE_COL_2,
          )}
        >
          {ONBOARDING_STEPS.map((i) => {
            const state = i < step ? 'done' : i === step ? 'now' : 'ahead';
            return (
              <span key={i} className="contents">
                <span
                  aria-current={state === 'now' ? 'step' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    state === 'done' ? 'text-brand-text' : state === 'now' ? 'text-ink' : 'text-muted',
                  )}
                >
                  {state === 'done' ? '✓' : i} {STEP_NAMES[i]}
                </span>
                {i < ONBOARDING_STEPS.length && (
                  <Leg state={i < step - 1 ? 'done' : i === step - 1 ? 'live' : 'ahead'} />
                )}
              </span>
            );
          })}
        </nav>
        <div className={cn('flex items-center gap-2 justify-self-end', PLACE_COL_3)}>
          <AppearanceControl />
          <GoButton
            to="/"
            onClick={(event) => {
              event.preventDefault();
              void skip();
            }}
            variant="ghost"
            size="sm"
            className="hover:bg-transparent! text-ink-2! font-semibold! text-[13.5px]! in-[html[data-platform=darwin]]:h-8 in-[html[data-platform=darwin]]:min-h-8"
          >
            Skip for now
          </GoButton>
        </div>
      </header>
      {skipError && (
        <p role="alert" className="px-14 pt-2 text-sm text-bad">
          Could not save your progress. Please try again.
        </p>
      )}
    </>
  );
}
