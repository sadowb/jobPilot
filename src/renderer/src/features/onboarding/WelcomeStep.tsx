import { NavButton } from '../../components/NavButton';
import { CapDartArt } from '../../components/CapDartArt';
import { cssVars } from '../../lib/css-vars';
import { OnboardingFrame } from './OnboardingFrame';
import { stepPath } from './steps';

const TRAIL = 'M-30 650 C120 640 200 500 280 400 S320 300 336 262';

export function WelcomeStep() {
  return (
    <OnboardingFrame step={1} minHeight={822}>
      <div
        className="welcome-layout"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="eyebrow">Welcome · about 3 minutes</div>
          <h1 className="h1" style={{ fontSize: 64, lineHeight: 1.04, margin: '20px 0 24px' }}>
            Hi, I’m Cap.
            <br />
            <span className="it">I’ll fill job applications for you.</span>
          </h1>
          <p className="mut" style={{ fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 480 }}>
            Paste the jobs you want. I read each one, fill the form from your profile and ask only what I can’t know.
            You decide what gets sent.
          </p>
          <div className="row nw" style={{ gap: 18, marginTop: 36 }}>
            <NavButton className="btn pri" to={stepPath(2)} style={{ minHeight: 58, padding: '0 30px', fontSize: 18 }}>
              Let’s start →
            </NavButton>
            <span className="s">5 short steps · skip any</span>
          </div>
          <div
            className="row nw"
            style={{
              gap: 12,
              marginTop: 44,
              padding: '14px 18px',
              border: '1px solid var(--line)',
              borderRadius: 16,
              maxWidth: 480,
              background: 'var(--bg)',
            }}
          >
            <span style={{ color: 'var(--brand-text)', display: 'grid', flex: 'none' }}>
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
            <span style={{ fontSize: 14.5 }}>
              <b>Runs on your machine.</b>{' '}
              <span className="s">Profile, CVs and answers are stored on this computer.</span>
            </span>
          </div>
        </div>
        <div
          className="welcome-art"
          style={{
            position: 'relative',
            width: '100%',
            height: 720,
            borderRadius: 28,
            border: '1px solid var(--line)',
            background: 'radial-gradient(circle at 80% 18%,var(--brand-tint),transparent 55%),var(--panel)',
            overflow: 'hidden',
          }}
        >
          <svg
            viewBox="0 0 720 720"
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
              style={cssVars({ '--d': '.1s', '--dur': '.9s' })}
            />
          </svg>
          <div
            className="v17-land"
            style={cssVars({ '--d': '.1s' }, { position: 'absolute', left: 300, top: 110, width: 300, height: 300 })}
          >
            <div className="v17-bob" style={{ width: 300, height: 300 }}>
              <CapDartArt size={300} gust />
            </div>
          </div>
          <div
            className="bub a v17-rise"
            style={cssVars({ '--d': '.8s' }, { position: 'absolute', left: 380, top: 44, fontSize: 16 })}
          >
            Ready when you are.
          </div>
          <div className="spec" style={{ position: 'absolute', left: 28, bottom: 24, color: 'var(--muted)' }}>
            Route · your first application
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
