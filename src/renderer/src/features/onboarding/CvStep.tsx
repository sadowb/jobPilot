import { NavButton } from '../../components/NavButton';
import { CapDartArt } from '../../components/CapDartArt';
import { cssVars } from '../../lib/css-vars';
import { CV_FIELDS, CV_FILE } from './data';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';
import { nextPath } from './steps';

const PENCIL = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
);

const THUMB_LINES = ['90%', '70%', '84%', '56%', '80%', '88%', '62%'];

/** The CV thumbnail is always white paper, in both themes (it depicts a document). */
function PaperThumb() {
  return (
    <div
      style={{
        flex: 'none',
        width: 92,
        height: 118,
        borderRadius: 9,
        border: '1px solid var(--line-2)',
        background: 'rgb(255 255 255)',
        padding: '12px 10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: '0 6px 18px color-mix(in srgb,var(--ink) 12%,transparent)',
      }}
    >
      {THUMB_LINES.map((w, i) => (
        <i
          key={i}
          style={{ display: 'block', height: 4, borderRadius: 2, background: 'rgb(17 17 17 / .22)', width: w }}
        />
      ))}
    </div>
  );
}

export function CvStep() {
  return (
    <OnboardingFrame step={2} minHeight={822}>
      <StepHeading
        eyebrow="Step 2 · Your CV"
        lead="Drop your CV."
        tail="I’ll read it, so you never retype it."
        lede="PDF or DOCX. Every field I find can be checked, and answers update when it changes."
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)',
          gap: 32,
        }}
      >
        <div style={{ minHeight: 0 }}>
          <div
            style={{
              height: '100%',
              boxSizing: 'border-box',
              border: '2px dashed var(--line-2)',
              borderRadius: 28,
              background: 'var(--panel)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <PaperThumb />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em' }}>{CV_FILE.name}</div>
              <div className="row nw" style={{ gap: 8, color: 'var(--brand-text)', fontSize: 14, fontWeight: 600 }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
                <span>
                  Read · {CV_FILE.pages} page · {CV_FILE.sizeKb} KB
                </span>
              </div>
            </div>
            <button className="btn ghost sm" type="button">
              Replace file
            </button>
            <div className="s" style={{ fontSize: 13 }}>
              Dropping another file replaces this one.
            </div>
          </div>
        </div>
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 28,
            background: 'var(--bg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div className="row sp nw" style={{ flex: 'none', padding: '18px 26px 14px', gap: 16 }}>
            <div className="row nw" style={{ gap: 14, minWidth: 0 }}>
              <span
                style={{
                  flex: 'none',
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'var(--brand-tint)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <CapDartArt size={40} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="eyebrow">Cap is reading</div>
                <div style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{CV_FILE.name}</div>
              </div>
            </div>
            <span className="spec" style={{ color: 'var(--muted)', flex: 'none' }}>
              {CV_FIELDS.length} fields found
            </span>
          </div>
          <div
            style={{
              flex: 'none',
              height: 4,
              background: 'var(--line)',
              margin: '0 26px',
              borderRadius: 9,
              overflow: 'hidden',
            }}
          >
            <div
              className="v17-bar"
              style={cssVars({ '--dur': '1s', '--d': '.1s' }, { height: 4, background: 'var(--brand)' })}
            />
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: 4 }}>
            {CV_FIELDS.map((f) => (
              <div
                key={f.label}
                className="v17-rise"
                style={cssVars(
                  { '--d': `${f.delay}s` },
                  {
                    flex: 'none',
                    display: 'grid',
                    gridTemplateColumns: '120px minmax(0,1fr) 20px',
                    gap: 14,
                    alignItems: 'center',
                    padding: '7px 26px',
                    borderTop: '1px solid var(--line)',
                  },
                )}
              >
                <span className="spec" style={{ color: 'var(--muted)' }}>
                  {f.label}
                </span>
                <div style={{ minWidth: 0, fontSize: 15.5, lineHeight: 1.45 }}>
                  {f.chips ? (
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {f.chips.map((c) => (
                        <span
                          key={c}
                          style={{
                            fontSize: 13,
                            border: '1px solid var(--line)',
                            borderRadius: 99,
                            padding: '4px 10px',
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <>
                      {f.value}
                      {f.secondary && (
                        <>
                          <br />
                          <span className="s">{f.secondary}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
                <span style={{ color: 'var(--muted)', display: 'grid' }}>{PENCIL}</span>
              </div>
            ))}
          </div>
          <div
            className="v17-rise"
            style={cssVars(
              { '--d': '0s' },
              {
                flex: 'none',
                padding: '14px 26px 18px',
                borderTop: '1px solid var(--line)',
                background: 'var(--panel)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              },
            )}
          >
            <div>
              <b style={{ fontSize: 18 }}>Looks right?</b>
              <div className="s">Every field can be changed. Fix one and I re-check the forms that use it.</div>
            </div>
            <div className="row nw" style={{ gap: 10 }}>
              <NavButton className="btn pri sm" to={nextPath(2)} style={{ minHeight: 44, padding: '0 22px' }}>
                Looks right
              </NavButton>
              <button className="btn sm" type="button" style={{ minHeight: 44, padding: '0 20px' }}>
                Edit fields
              </button>
            </div>
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
