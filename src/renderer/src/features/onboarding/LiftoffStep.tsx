import { AgentBotArt } from '../../components/AgentBotArt';
import { CapDartArt } from '../../components/CapDartArt';
import { cx } from '../../components/ui';
import { cssVars } from '../../lib/css-vars';
import { A_BAR, A_BOB, A_GUST, A_LIFT, A_RISE, A_TRAIL, BUBBLE, CELL, GoButton, PILL, S, SPEC } from '../shared-ui';
import { FIRST_JOBS, SETUP_CHECKLIST } from './data';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';
import { ChecklistRow } from './SetupChecklist';
import { nextPath } from './steps';

const TRAIL = 'M-20 600 C140 560 260 470 360 380 S520 170 640 110';
/** Rows stagger 120ms apart. */
const stagger = (base: number, i: number) => `${(base + i * 0.12).toFixed(2)}s`;

export function LiftoffStep() {
  const n = SETUP_CHECKLIST.length;
  return (
    <OnboardingFrame step={5} minHeight={822}>
      <StepHeading
        eyebrow="Step 5 · Liftoff"
        lead="You’re set."
        tail="Cap takes off."
        lede="Checklist complete. Mercury is already running."
      />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch gap-12">
        <div className="relative h-full min-h-[600px] overflow-hidden rounded-[28px] border border-line [background:radial-gradient(circle_at_20%_92%,var(--brand-tint),transparent_55%),var(--panel)]">
          <svg viewBox="0 0 680 640" className="absolute inset-0 size-full" aria-hidden="true">
            <path
              d={TRAIL}
              fill="none"
              stroke="var(--line-2)"
              strokeWidth="2"
              strokeDasharray="2 9"
              strokeLinecap="round"
            />
            <path
              className={cx(A_TRAIL, '[--d:.1s] [--dur:1s]')}
              pathLength="1"
              d={TRAIL}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div className={cx('absolute top-[290px] left-[110px] size-[300px]', A_LIFT, A_GUST)}>
            <div className={cx('size-[300px]', A_BOB)}>
              <CapDartArt size={300} gust />
            </div>
          </div>
          <div className={cx(BUBBLE, 'absolute top-9 left-9 max-w-[360px] px-4 py-3 text-[16px] [--d:.9s]', A_RISE)}>
            Mercury first. I’ll tell you when it’s sent.
          </div>
          <div className={cx(SPEC, 'absolute bottom-6 left-7 text-muted')}>Take-off · first application</div>
        </div>
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className={cx(CELL, 'gap-1 px-[22px] py-5')}>
            <div className="flex items-center justify-between gap-3">
              <b className="text-[17px]">Checklist</b>
              <span className={cx(SPEC, 'text-brand-text')}>
                {n} of {n} done
              </span>
            </div>
            <div className="mt-1 mb-1.5 h-1 overflow-hidden rounded-[9px] bg-line">
              <div className={cx('h-1 bg-brand [--d:.1s] [--dur:.8s]', A_BAR)} />
            </div>
            {SETUP_CHECKLIST.map((item, i) => (
              <ChecklistRow key={item.title} item={item} delay={stagger(0.1, i)} />
            ))}
          </div>
          <div className={cx(CELL, 'gap-2 px-[22px] py-5')}>
            <div className="flex items-center justify-between gap-3">
              <b className="text-[17px]">Up next</b>
              <span className={cx(SPEC, 'text-muted')}>{FIRST_JOBS.length} in Up next · about 6 min</span>
            </div>
            {FIRST_JOBS.map((j, i) => (
              <div
                key={j.url}
                className={cx(
                  'flex items-center gap-3 rounded-2xl border border-line bg-bg px-3.5 py-[7px]',
                  A_RISE,
                )}
                style={cssVars({ '--d': stagger(0.45, i) })}
              >
                <AgentBotArt company={j.company} state={i === 0 ? 'work' : 'idle'} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{j.company}</div>
                  <div className={cx(S, 'truncate text-[13px]')}>
                    {j.role} · {j.site}
                  </div>
                </div>
                <span
                  className={cx(
                    PILL,
                    i === 0 ? 'bg-[rgba(0,132,106,0.14)] text-brand-text' : 'bg-line text-muted',
                  )}
                >
                  {i === 0 ? 'Running · ~2 min' : 'Queued'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <GoButton to={nextPath(5)} variant="primary" className="min-h-[52px]! w-full text-[16px]!">
              Go to Dashboard →
            </GoButton>
            <div className={cx(S, 'text-center text-[13px]')}>
              Cap keeps working in the background. Inbox shows only what needs you.
            </div>
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
