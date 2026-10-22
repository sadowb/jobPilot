import { useState } from 'react';
import { CapDartArt } from '../../components/CapDartArt';
import { Eyebrow, cx } from '../../components/ui';
import { cssVars } from '../../lib/css-vars';
import { A_POP, A_RISE, BUBBLE, CELL, GoButton, S, SPEC } from '../shared-ui';
import { FACT_QUESTIONS, FACT_USES } from './data';
import { activeQuestion, answer, answeredCount, emptyAnswers } from './facts';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';
import { nextPath } from './steps';

const CAP_AVATAR = (
  <span className="grid size-10 flex-none place-items-center rounded-[14px] bg-brand-tint">
    <CapDartArt size={31} />
  </span>
);

const CHIP = 'relative h-[42px] cursor-pointer rounded-full border px-[18px] text-[15px] font-medium! whitespace-nowrap';

function Bubble({ text, delay, dim }: { text: string; delay: string; dim: boolean }) {
  return (
    <div className={cx('flex items-end gap-3.5', A_RISE)} style={cssVars({ '--d': delay })}>
      {CAP_AVATAR}
      <div className={cx(BUBBLE, 'max-w-[600px] self-start px-[18px] py-3.5 text-[16px] leading-normal', dim && 'opacity-45')}>
        {text}
      </div>
    </div>
  );
}

export function FactsStep() {
  const [answers, setAnswers] = useState(emptyAnswers);
  // The first question's options are not drawn on the board (only the dashed "Your answer" pill), so they open on click.
  const [authOpen, setAuthOpen] = useState(false);
  const active = activeQuestion(answers);
  const done = answeredCount(answers);

  const pick = (q: number, option: string) => setAnswers((a) => answer(a, q, option));

  return (
    <OnboardingFrame step={4} minHeight={742}>
      <StepHeading
        eyebrow="Step 4 · Three quick facts"
        lead="Three facts,"
        tail="then I stop asking."
        lede="Tap an answer. Each one applies to every job, and you can change it in Profile at any time."
      />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] items-start gap-12">
        <div className="flex max-w-[760px] min-w-0 flex-col gap-[18px]">
          <Bubble text="Three quick facts, then I stop asking. I use them on every form." delay="0s" dim={false} />
          {FACT_QUESTIONS.map((q, i) => {
            const future = active !== null && i > active;
            const chosen = answers[i];
            return (
              <div key={q.id} className="flex flex-col gap-[18px]">
                <Bubble text={q.prompt} delay={i === 0 ? '0.1s' : '0s'} dim={future} />
                <div className="flex flex-col gap-3 pl-[54px]">
                  <div className="flex flex-wrap gap-2">
                    {i === 0 && !authOpen && chosen === null ? (
                      <span className={cx('inline-flex', A_POP)} style={cssVars({ '--d': '0.05s' })}>
                        <button
                          type="button"
                          onClick={() => setAuthOpen(true)}
                          className={cx(CHIP, 'border-dashed border-line-2 bg-bg font-medium text-muted!')}
                        >
                          Your answer
                          <span
                            className="pointer-events-none absolute -inset-[5px] animate-[v17ripple_1.8s_ease-out_infinite] rounded-[99px] border-2 border-brand motion-reduce:hidden"
                            aria-hidden="true"
                          />
                        </button>
                      </span>
                    ) : (
                      q.options.map((o) => (
                        <span key={o} className={cx('inline-flex [--d:0s]', A_POP)}>
                          <button
                            type="button"
                            disabled={future}
                            aria-pressed={chosen === o}
                            onClick={() => pick(i, o)}
                            className={cx(
                              CHIP,
                              'text-ink!',
                              future && 'opacity-45',
                              chosen === o ? 'border-ink bg-panel font-semibold!' : 'border-line-2 bg-bg',
                            )}
                          >
                            {o}
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  {i === 0 && (
                    <div className={cx(S, 'text-[13px] [--d:.3s]', A_RISE)}>
                      Your decision. Cap won’t assume it. Change it any time in Profile → What the agents know.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {done === FACT_QUESTIONS.length && (
            <div className={cx('flex items-center gap-3.5 pl-[54px] [--d:0s]', A_RISE)}>
              <GoButton to={nextPath(4)} variant="primary" className="min-h-[52px]! px-[26px]! text-[16px]! text-on-pri!">
                Save and continue →
              </GoButton>
            </div>
          )}
        </div>
        <aside className={cx(CELL, 'gap-4 p-[26px]')}>
          <Eyebrow>Saved to Profile · Facts</Eyebrow>
          <b className="-mt-1 text-[18px]">What I do with these</b>
          {FACT_USES.map((u) => (
            <div key={u.tag} className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 border-t border-line py-3">
              <span className={cx(SPEC, 'text-brand-text tracking-[0.02em]!')}>{u.tag}</span>
              <span className="text-[14px] leading-normal">{u.text}</span>
            </div>
          ))}
          <div className="mt-auto border-t border-line pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className={cx(S, 'text-[13.5px]')}>Answered</span>
              <span className={cx(SPEC, 'text-muted tracking-[0.02em]!')}>
                {done} of {FACT_QUESTIONS.length}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-[9px] bg-line">
              <div
                className="h-1 bg-brand transition-[width] duration-200 ease-[ease]"
                // Width follows the answer count.
                style={{ width: `${(done / FACT_QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>
        </aside>
      </div>
    </OnboardingFrame>
  );
}
