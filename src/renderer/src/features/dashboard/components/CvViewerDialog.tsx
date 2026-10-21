import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { V17Kbd } from '../../../components/V17Kbd';
import { PAPER_TOKENS } from '../../../components/V17MiniPaper';
import type { CvLine, SentCv } from '../cv';

const sectionHeading: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10.5,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  borderBottom: '1px solid var(--line)',
  paddingBottom: 6,
  margin: '22px 0 10px',
};
const bodyLine: CSSProperties = { position: 'relative', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' };
const changeBar: CSSProperties = {
  position: 'absolute',
  left: -22,
  top: 3,
  bottom: 3,
  width: 3,
  borderRadius: 2,
  background: 'var(--brand)',
};
const metaLabel: CSSProperties = {
  padding: '8px 0',
  borderTop: '1px solid var(--line)',
  fontSize: 10.5,
  textTransform: 'uppercase',
};
const metaValue: CSSProperties = { padding: '8px 0', borderTop: '1px solid var(--line)' };

function Line({ line, view, nested }: { line: CvLine; view: 'sent' | 'current'; nested: boolean }) {
  const text = view === 'current' && line.currentText ? line.currentText : line.text;
  const changed = Boolean(line.currentText);
  if (!changed) {
    return <div style={nested ? { ...bodyLine, marginTop: 3 } : bodyLine}>{text}</div>;
  }
  const inner = (
    <div style={bodyLine}>
      <i style={changeBar} />
      {text}
    </div>
  );
  return nested ? <div style={{ marginTop: 3 }}>{inner}</div> : inner;
}

/**
 * Full-size view of the exact CV a job received (modal over the dashboard). Esc closes it; focus moves in
 * on open and returns to the opener on close. The "Current version" toggle shows today's CV for comparison.
 */
export function CvViewerDialog({ company, cv, onClose }: { company: string; cv: SentCv; onClose: () => void }) {
  const [view, setView] = useState<'sent' | 'current'>('sent');
  const closeRef = useRef<HTMLButtonElement>(null);
  const diff = cv.changes;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, []);

  return (
    <>
      <div className="scrim cvs" style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={onClose} />
      <div
        className="cvm"
        role="dialog"
        aria-modal="true"
        aria-label="CV viewer, sent version"
        onKeyDown={(e) => {
          // Keep Tab inside the dialog.
          if (e.key !== 'Tab') return;
          const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
            'button, [href], [tabindex]:not([tabindex="-1"])',
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        style={{
          position: 'fixed',
          left: 48,
          right: 48,
          top: 40,
          bottom: 40,
          zIndex: 30,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 24,
          boxShadow: 'var(--float)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          className="row sp nw"
          style={{ padding: '14px 22px 14px 26px', borderBottom: '1px solid var(--line)', flex: 'none' }}
        >
          <div className="row nw" style={{ gap: 12, minWidth: 0 }}>
            <span className="spec" style={{ textTransform: 'uppercase' }}>
              CV · full size
            </span>
            <span className="s" style={{ fontSize: 13 }}>
              The exact file {company} received · 1 page
            </span>
          </div>
          <div className="row nw" style={{ gap: 10 }}>
            <span className="row nw s" style={{ gap: 6, fontSize: 12 }}>
              <V17Kbd>Esc</V17Kbd>
              <span>to close</span>
            </span>
            <button ref={closeRef} className="btn sm" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
          <div
            style={{
              position: 'relative',
              background: 'var(--panel)',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            <div className="row nw s" style={{ position: 'absolute', left: 24, top: 16, gap: 10, fontSize: 12 }}>
              <span>Page 1 of 1</span>
              <span>·</span>
              <span>Fit page · 90%</span>
            </div>
            <div style={{ transform: 'scale(.9)', transformOrigin: 'center' }}>
              <div
                style={{
                  ...PAPER_TOKENS,
                  width: 580,
                  height: 780,
                  boxSizing: 'border-box',
                  padding: '44px 52px 36px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: 4,
                  boxShadow: 'var(--float)',
                  position: 'relative',
                  overflow: 'hidden',
                  color: 'var(--ink)',
                  fontFamily: 'var(--sans)',
                }}
              >
                <div style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, letterSpacing: '-.015em' }}>
                  {cv.document.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10 }}>{cv.document.headline}</div>
                {cv.document.sections.map((section) => (
                  <div key={section.heading}>
                    <div style={sectionHeading}>{section.heading}</div>
                    {section.entries?.map((entry) => (
                      <div key={entry.title} style={{ position: 'relative', marginBottom: 10 }}>
                        <div className="row sp nw" style={{ gap: 12, alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{entry.title}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                            {entry.when}
                          </span>
                        </div>
                        {entry.lines.map((l) => (
                          <Line key={l.text} line={l} view={view} nested />
                        ))}
                      </div>
                    ))}
                    {section.lines?.map((l) => (
                      <Line key={l.text} line={l} view={view} nested={false} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            style={{
              borderLeft: '1px solid var(--line)',
              padding: 26,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Sent to {company}
              </div>
              <h2 className="h2" style={{ fontSize: 34, lineHeight: 1.05, margin: 0 }}>
                {cv.fileName}
              </h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)',
                columnGap: 16,
                fontSize: 13,
              }}
            >
              <div className="spec" style={metaLabel}>
                Sent
              </div>
              <div style={metaValue}>{cv.sentAt}</div>
              <div className="spec" style={metaLabel}>
                Job
              </div>
              <div style={metaValue}>{cv.jobTitle}</div>
              <div className="spec" style={metaLabel}>
                File
              </div>
              <div style={metaValue}>{cv.fileMeta}</div>
              <div className="spec" style={metaLabel}>
                Checksum
              </div>
              <div style={metaValue}>{cv.checksum}</div>
            </div>
            <div
              className="seg"
              role="tablist"
              aria-label="CV version"
              style={{ alignSelf: 'flex-start', flex: 'none' }}
            >
              <span
                role="tab"
                tabIndex={0}
                aria-selected={view === 'sent'}
                className={view === 'sent' ? 'on' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={() => setView('sent')}
                onKeyDown={(e) => e.key === 'Enter' && setView('sent')}
              >
                Sent version
              </span>
              <span
                role="tab"
                tabIndex={0}
                aria-selected={view === 'current'}
                className={view === 'current' ? 'on' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={() => setView('current')}
                onKeyDown={(e) => e.key === 'Enter' && setView('current')}
              >
                Current version
              </span>
            </div>
            {diff.length > 0 && (
              <div
                className="callout"
                style={{
                  flexDirection: 'column',
                  gap: 10,
                  padding: '16px 18px',
                  background: 'var(--brand-tint)',
                  boxShadow: 'inset 3px 0 0 var(--brand)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                  Your current CV differs in {diff.length} {diff.length === 1 ? 'line' : 'lines'}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                  {diff.map((note) => (
                    <div key={note}>
                      <span style={{ color: 'var(--brand-text)' }}>+</span>
                      {` ${note}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="s" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
              Locked at submit. This is the file {company} received. Your edits apply to future applications only.
            </div>
            <div className="row nw" style={{ gap: 8, marginTop: 'auto' }}>
              <button className="btn pri grow" type="button">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
