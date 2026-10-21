import { useState } from 'react';
import { NavButton } from '../../components/NavButton';
import { CapDartArt } from '../../components/CapDartArt';
import { cssVars } from '../../lib/css-vars';
import { FACT_QUESTIONS, FACT_USES } from './data';
import { activeQuestion, answer, answeredCount, emptyAnswers } from './facts';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';
import { nextPath } from './steps';

const CAP_AVATAR = (
  <span
    style={{
      flex: 'none',
      width: 40,
      height: 40,
      borderRadius: 14,
      background: 'var(--brand-tint)',
      display: 'grid',
      placeItems: 'center',
    }}
  >
    <CapDartArt size={31} />
  </span>
);

const chipBase = {
  position: 'relative',
  height: 42,
  padding: '0 18px',
  borderRadius: 99,
  border: '1px solid var(--line-2)',
  background: 'var(--bg)',
  fontSize: 15,
  fontWeight: 500,
  whiteSpace: 'nowrap',
} as const;

function Bubble({ text, delay, dim }: { text: string; delay: string; dim: boolean }) {
  return (
    <div className="v17-rise" style={cssVars({ '--d': delay }, { display: 'flex', gap: 14, alignItems: 'flex-end' })}>
      {CAP_AVATAR}
      <div
        className="bub a"
        style={{
          maxWidth: 600,
          fontSize: 16,
          lineHeight: 1.5,
          padding: '14px 18px',
          ...(dim ? { opacity: 0.45 } : {}),
        }}
      >
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
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 340px',
          gap: 48,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760, minWidth: 0 }}>
          <Bubble text="Three quick facts, then I stop asking. I use them on every form." delay="0s" dim={false} />
          {FACT_QUESTIONS.map((q, i) => {
            const future = active !== null && i > active;
            const chosen = answers[i];
            return (
              <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Bubble text={q.prompt} delay={i === 0 ? '0.1s' : '0s'} dim={future} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 54 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {i === 0 && !authOpen && chosen === null ? (
                      <span className="v17-pop" style={cssVars({ '--d': '0.05s' }, { display: 'inline-flex' })}>
                        <button
                          type="button"
                          onClick={() => setAuthOpen(true)}
                          style={{ ...chipBase, color: 'var(--muted)', borderStyle: 'dashed' }}
                        >
                          Your answer
                          <span className="v17-ripple" aria-hidden="true" />
                        </button>
                      </span>
                    ) : (
                      q.options.map((o) => (
                        <span key={o} className="v17-pop" style={cssVars({ '--d': '0s' }, { display: 'inline-flex' })}>
                          <button
                            type="button"
                            disabled={future}
                            aria-pressed={chosen === o}
                            onClick={() => pick(i, o)}
                            style={{
                              ...chipBase,
                              color: 'var(--ink)',
                              ...(future ? { opacity: 0.45 } : {}),
                              ...(chosen === o
                                ? { borderColor: 'var(--ink)', background: 'var(--panel)', fontWeight: 600 }
                                : {}),
                            }}
                          >
                            {o}
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  {i === 0 && (
                    <div className="s v17-rise" style={cssVars({ '--d': '.3s' }, { fontSize: 13 })}>
                      Your decision. Cap won’t assume it. Change it any time in Profile → What the agents know.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {done === FACT_QUESTIONS.length && (
            <div className="row nw v17-rise" style={cssVars({ '--d': '0s' }, { gap: 14, paddingLeft: 54 })}>
              <NavButton
                className="btn pri"
                to={nextPath(4)}
                style={{ minHeight: 52, padding: '0 26px', fontSize: 16 }}
              >
                Save and continue →
              </NavButton>
            </div>
          )}
        </div>
        <aside className="mcell" style={{ gap: 16, padding: 26, minWidth: 0 }}>
          <div className="eyebrow">Saved to Profile · Facts</div>
          <b style={{ fontSize: 18, marginTop: -4 }}>What I do with these</b>
          {FACT_USES.map((u) => (
            <div
              key={u.tag}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '4px 14px',
                padding: '12px 0',
                borderTop: '1px solid var(--line)',
              }}
            >
              <span className="spec" style={{ color: 'var(--brand-text)' }}>
                {u.tag}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{u.text}</span>
            </div>
          ))}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div className="row sp nw">
              <span className="s">Answered</span>
              <span className="spec">
                {done} of {FACT_QUESTIONS.length}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--line)', borderRadius: 9, marginTop: 8, overflow: 'hidden' }}>
              <div
                style={{
                  height: 4,
                  width: `${(done / FACT_QUESTIONS.length) * 100}%`,
                  background: 'var(--brand)',
                  transition: 'width .2s',
                }}
              />
            </div>
          </div>
        </aside>
      </div>
    </OnboardingFrame>
  );
}
