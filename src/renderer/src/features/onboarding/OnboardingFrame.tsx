import type { ReactNode } from 'react';
import { AppearanceControl } from '../../components/AppearanceControl';
import { Logo } from '../../components/Logo';
import { Eyebrow, cx } from '../../components/ui';
import '../../styles/motion.css'; // keyframes only (`v17rise`, `v17pop`, ...)
import { GoButton, H1, IT, REDUCE_ALL, S, SPEC } from '../shared-ui';
import { ONBOARDING_STEPS, dotState, type OnboardingStep } from './steps';

const DARWIN = 'in-[html[data-platform=darwin]]';

/**
 * Setup header. On macOS it becomes the sticky, draggable toolbar strip behind the native window controls
 * (80px spacer in column 1, progress in column 2, actions in column 3); everywhere else it is a plain 3-column grid.
 */
const HEADER = cx(
  'grid grid-cols-[1fr_auto_1fr] items-center gap-6 bg-transparent px-14 py-[22px]',
  `${DARWIN}:sticky ${DARWIN}:top-0 ${DARWIN}:z-1 ${DARWIN}:h-(--app-toolbar-height) ${DARWIN}:min-h-(--app-toolbar-height) ${DARWIN}:gap-4 ${DARWIN}:bg-ground ${DARWIN}:px-6 ${DARWIN}:py-1.5`,
  `${DARWIN}:[-webkit-app-region:drag] ${DARWIN}:[app-region:drag] ${DARWIN}:select-none`,
  `${DARWIN}:before:col-start-1 ${DARWIN}:before:row-start-1 ${DARWIN}:before:h-8 ${DARWIN}:before:w-20 ${DARWIN}:before:content-['']`,
  `${DARWIN}:[&_:is(a,button,input,select,textarea,[role=button],[role=radio])]:[-webkit-app-region:no-drag] ${DARWIN}:[&_:is(a,button,input,select,textarea,[role=button],[role=radio])]:[app-region:no-drag]`,
);
const PLACE_COL_2 = `${DARWIN}:[grid-column:2] ${DARWIN}:[grid-row:1]`;
const PLACE_COL_3 = `${DARWIN}:[grid-column:3] ${DARWIN}:[grid-row:1]`;

/** Header (logo, 5-dot progress, skip) plus the content area every onboarding step sits in. */
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
      <header className={HEADER}>
        {window.jobpilot?.platform !== 'darwin' && <Logo label="JobPilot, setup" />}
        <div
          className={cx('flex items-center gap-2 justify-self-center', PLACE_COL_2)}
          role="img"
          aria-label={`Step ${step} of 5`}
        >
          {ONBOARDING_STEPS.map((i) => {
            const state = dotState(i, step);
            return (
              <i
                key={i}
                className={cx('block h-2 rounded-full', state === 'current' ? 'w-7' : 'w-2', state === 'ahead' ? 'bg-line-2' : 'bg-brand')}
              />
            );
          })}
          <span className={cx(SPEC, 'ml-2.5 text-muted')}>{step} / 5</span>
        </div>
        <div className={cx('flex items-center gap-2 justify-self-end', PLACE_COL_3)}>
          <AppearanceControl />
          {/* `.btn.ghost` never had a hover fill, unlike the primitive's ghost variant. */}
          <GoButton to="/" variant="ghost" size="sm" className={`hover:bg-transparent! ${DARWIN}:h-8 ${DARWIN}:min-h-8`}>
            Skip for now
          </GoButton>
        </div>
      </header>
      <div
        className={cx('flex flex-col gap-7 px-14 pt-2 pb-12', REDUCE_ALL)}
        // The minimum height is a per-step prop (the board's content height).
        style={{ minHeight }}
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
    <div className="flex flex-col gap-2.5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className={cx(H1, 'text-[56px] leading-[1.04]')}>
        {lead} <span className={IT}>{tail}</span>
      </h1>
      <p className={cx(S, 'm-0 max-w-[760px] text-[17px] leading-normal')}>{lede}</p>
    </div>
  );
}
