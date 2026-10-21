import { NavButton } from '../../components/NavButton';
import { AgentBotArt } from '../../components/AgentBotArt';
import { CapDartArt } from '../../components/CapDartArt';
import { cssVars } from '../../lib/css-vars';
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
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)',
          gap: 48,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '100%',
            minHeight: 600,
            borderRadius: 28,
            border: '1px solid var(--line)',
            background: 'radial-gradient(circle at 20% 92%,var(--brand-tint),transparent 55%),var(--panel)',
            overflow: 'hidden',
          }}
        >
          <svg
            viewBox="0 0 680 640"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            <path
              d={TRAIL}
              fill="none"
              stroke="var(--line-2)"
              strokeWidth="2"
              strokeDasharray="2 9"
              strokeLinecap="round"
            />
            <path
              className="v17-trail"
              pathLength="1"
              d={TRAIL}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinecap="round"
              style={cssVars({ '--d': '.1s', '--dur': '1s' })}
            />
          </svg>
          <div className="v17-lift" style={{ position: 'absolute', left: 110, top: 290, width: 300, height: 300 }}>
            <div className="v17-bob" style={{ width: 300, height: 300 }}>
              <CapDartArt size={300} gust />
            </div>
          </div>
          <div
            className="bub a v17-rise"
            style={cssVars({ '--d': '.9s' }, { position: 'absolute', left: 36, top: 36, maxWidth: 360, fontSize: 16 })}
          >
            Mercury first. I’ll tell you when it’s sent.
          </div>
          <div className="spec" style={{ position: 'absolute', left: 28, bottom: 24, color: 'var(--muted)' }}>
            Take-off · first application
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="mcell" style={{ gap: 4, padding: '20px 22px' }}>
            <div className="row sp nw">
              <b style={{ fontSize: 17 }}>Checklist</b>
              <span className="spec" style={{ color: 'var(--brand-text)' }}>
                {n} of {n} done
              </span>
            </div>
            <div
              style={{ height: 4, background: 'var(--line)', borderRadius: 9, overflow: 'hidden', margin: '4px 0 6px' }}
            >
              <div
                className="v17-bar"
                style={cssVars({ '--dur': '.8s', '--d': '.1s' }, { height: 4, background: 'var(--brand)' })}
              />
            </div>
            {SETUP_CHECKLIST.map((item, i) => (
              <ChecklistRow key={item.title} item={item} delay={stagger(0.1, i)} />
            ))}
          </div>
          <div className="mcell" style={{ gap: 8, padding: '20px 22px' }}>
            <div className="row sp nw">
              <b style={{ fontSize: 17 }}>Up next</b>
              <span className="spec" style={{ color: 'var(--muted)' }}>
                {FIRST_JOBS.length} in Up next · about 6 min
              </span>
            </div>
            {FIRST_JOBS.map((j, i) => (
              <div
                key={j.url}
                className="v17-rise"
                style={cssVars(
                  { '--d': stagger(0.45, i) },
                  {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '7px 14px',
                    border: '1px solid var(--line)',
                    borderRadius: 16,
                    background: 'var(--bg)',
                  },
                )}
              >
                <AgentBotArt company={j.company} state={i === 0 ? 'work' : 'idle'} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{j.company}</div>
                  <div
                    className="s"
                    style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {j.role} · {j.site}
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: i === 0 ? 'var(--brand-text)' : 'var(--muted)',
                    background: i === 0 ? 'rgba(0,132,106,.14)' : 'var(--line)',
                    borderRadius: 99,
                    padding: '3px 10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {i === 0 ? 'Running · ~2 min' : 'Queued'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <NavButton
              className="btn pri"
              to={nextPath(5)}
              style={{ minHeight: 52, fontSize: 16, justifyContent: 'center', width: '100%' }}
            >
              Go to Dashboard →
            </NavButton>
            <div className="s" style={{ textAlign: 'center', fontSize: 13 }}>
              Cap keeps working in the background. Inbox shows only what needs you.
            </div>
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
