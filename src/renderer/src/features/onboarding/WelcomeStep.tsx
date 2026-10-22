import { CapDartArt } from '../../components/CapDartArt';
import { Eyebrow, cx } from '../../components/ui';
import {
  A_BOB,
  A_GUST,
  A_LAND,
  A_RISE,
  A_TRAIL,
  BUBBLE,
  GoButton,
  H1,
  IT,
  S,
  SPEC,
} from '../shared-ui';
import { OnboardingFrame } from './OnboardingFrame';
import { stepPath } from './steps';

const TRAIL = 'M-30 650 C120 640 200 500 280 400 S320 300 336 262';

/** Below 1194px the art square scales with the column instead of keeping its 720px board size. */
const NARROW = 'max-[1194px]';

export function WelcomeStep() {
  return (
    <OnboardingFrame step={1} minHeight={822}>
      <div className={`grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-12 ${NARROW}:gap-8!`}>
        <div className="flex min-w-0 flex-col">
          <Eyebrow>Welcome · about 3 minutes</Eyebrow>
          <h1 className={cx(H1, 'mt-5 mb-6 text-[64px] leading-[1.04]', `${NARROW}:text-[52px]!`)}>
            Hi, I’m Cap.
            <br />
            <span className={IT}>I’ll fill job applications for you.</span>
          </h1>
          <p className={cx(S, 'm-0 max-w-[480px] text-[18px] leading-[1.6]')}>
            Paste the jobs you want. I read each one, fill the form from your profile and ask only what I can’t know.
            You decide what gets sent.
          </p>
          <div className="mt-9 flex items-center gap-[18px]">
            <GoButton to={stepPath(2)} variant="primary" className="min-h-[58px]! px-[30px]! text-[18px]! text-on-pri!">
              Let’s start →
            </GoButton>
            <span className={cx(S, 'text-[13.5px]')}>5 short steps · skip any</span>
          </div>
          <div className="mt-11 flex max-w-[480px] items-center gap-3 rounded-2xl border border-line bg-bg px-[18px] py-3.5">
            <span className="grid flex-none text-brand-text">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="5" y="11" width="14" height="10" rx="2.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <span className="text-[14.5px]">
              <b>Runs on your machine.</b>{' '}
              <span className={cx(S, 'text-[13.5px]')}>Profile, CVs and answers are stored on this computer.</span>
            </span>
          </div>
        </div>
        <div
          className={cx(
            'relative h-[720px] w-full overflow-hidden rounded-[28px] border border-line',
            '[background:radial-gradient(circle_at_80%_18%,var(--brand-tint),transparent_55%),var(--panel)]',
            `${NARROW}:aspect-square ${NARROW}:h-auto!`,
          )}
        >
          <svg viewBox="0 0 720 720" className="absolute inset-0 size-full" aria-hidden="true">
            <path
              d={TRAIL}
              fill="none"
              stroke="var(--line-2)"
              strokeWidth="2"
              strokeDasharray="2 9"
              strokeLinecap="round"
            />
            <path
              className={cx(A_TRAIL, '[--d:.1s] [--dur:.9s]')}
              pathLength="1"
              d={TRAIL}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div
            className={cx(
              'absolute top-[110px] left-[300px] size-[300px] [--d:.1s]',
              A_LAND,
              A_GUST,
              `${NARROW}:top-[15%]! ${NARROW}:left-[34%]! ${NARROW}:h-auto! ${NARROW}:w-1/2!`,
            )}
          >
            <div
              className={cx(
                'size-[300px]',
                A_BOB,
                `${NARROW}:h-auto! ${NARROW}:w-full! ${NARROW}:[&>svg]:h-auto! ${NARROW}:[&>svg]:w-full!`,
              )}
            >
              <CapDartArt size={300} gust />
            </div>
          </div>
          <div
            className={cx(
              BUBBLE,
              'absolute top-[44px] left-[380px] max-w-[78%] px-4 py-3 text-[16px] [--d:.8s]',
              A_RISE,
              `${NARROW}:top-[30px]! ${NARROW}:left-[40%]! ${NARROW}:text-[13px]!`,
            )}
          >
            Ready when you are.
          </div>
          <div className={cx(SPEC, 'absolute bottom-6 left-7 text-muted tracking-[0.02em]!')}>Route · your first application</div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
