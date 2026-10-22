import { CapDartArt } from '../../components/CapDartArt';
import { KbdKey } from '../../components/KbdKey';
import { Button, Eyebrow, cx } from '../../components/ui';
import '../../styles/motion.css'; // keyframes only (`v17rise`, `v17ring`, ...)
import { A_RISE, BUBBLE, CELL, H1, REDUCE_ALL, S, SPEC, shellButton } from '../shared-ui';
import { SETUP_CHECKLIST } from './data';
import { ChecklistRow } from './SetupChecklist';

/**
 * Dashboard on the first day (V17_On_Empty): shown at `/` while there are no applications.
 * Renders the page body only; the Dashboard screen supplies the top bar and decides when to show this.
 */

const KPIS = [
  { label: 'APPLIED', value: '0', note: 'Nothing sent yet' },
  { label: 'REPLY RATE', value: '—', note: 'Shows after 5 applications' },
  { label: 'INTERVIEWS', value: '0', note: 'Waiting on replies' },
  { label: 'AVG. TO REJECTION', value: '—', note: 'No data yet' },
] as const;

const FILTERS = ['All', 'Submitted', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
const COLUMNS = ['COMPANY · ROLE', 'LOCATION', 'STATUS', 'SALARY', 'SITE', 'APPLIED'] as const;
const GRID = '2.1fr 1.3fr 1.1fr .9fr .8fr .6fr';
const SKELETON_BARS = ['70%', '46%', '60%', '50%', '34%'] as const;
const RING_C = 251.3;

const skel = (width: string) => (
  <i style={{ display: 'block', height: 10, width, borderRadius: 6, background: 'var(--line)' }} />
);

function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      style={{
        flex: 'none',
        display: 'grid',
        gridTemplateColumns: GRID,
        alignItems: 'center',
        fontSize: 13.5,
        borderTop: '1px dashed var(--line-2)',
        opacity: 0.55,
      }}
    >
      <div style={{ padding: '14px 8px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span
          style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px dashed var(--line-2)', flex: 'none' }}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {skel('55%')}
          {skel('38%')}
        </div>
      </div>
      {SKELETON_BARS.map((w) => (
        <div key={w} style={{ padding: '14px 8px' }}>
          {skel(w)}
        </div>
      ))}
    </div>
  );
}

const pageBtn = {
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 10,
  border: '1px solid var(--line)',
  fontSize: 13,
} as const;

export function FirstDay() {
  const total = SETUP_CHECKLIST.length;
  return (
    <div
      className="v17"
      style={{
        boxSizing: 'border-box',
        height: 'calc(100vh - var(--app-toolbar-height))',
        minHeight: 814,
        padding: '28px 40px 48px',
        display: 'flex',
      }}
    >
      <div
        style={{ flex: 1, minWidth: 0, display: 'flex', gap: 24, height: '100%', minHeight: 0, alignItems: 'stretch' }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row sp nw" style={{ gap: 24, alignItems: 'flex-end' }}>
            <div className="row nw" style={{ gap: 18, minWidth: 0 }}>
              <h1 className="h1" style={{ fontSize: 42, margin: 0 }}>
                Dashboard
              </h1>
              <div className="seg" style={{ flex: 'none' }}>
                <span className="on">
                  Applied <b>0</b>
                </span>
                <span>
                  Up next <b>{total}</b>
                </span>
              </div>
            </div>
            <button className="btn pri sm" type="button" style={{ flex: 'none' }}>
              Add jobs
              <span style={{ opacity: 0.6, marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 12 }}>⌘V</span>
            </button>
          </div>
          <div className="row nw" style={{ gap: 12 }}>
            {KPIS.map((k) => (
              <div key={k.label} className="mcell" style={{ flex: 1, gap: 4, padding: '16px 18px' }}>
                <span className="spec" style={{ color: 'var(--muted)' }}>
                  {k.label}
                </span>
                <b style={{ fontSize: 28, fontWeight: 600, color: 'var(--muted)' }}>{k.value}</b>
                <span className="s" style={{ fontSize: 13 }}>
                  {k.note}
                </span>
              </div>
            ))}
          </div>
          <div className="row sp nw" style={{ gap: 16 }}>
            <div style={{ flex: 'none' }}>
              <div
                className="inp"
                style={{
                  width: 264,
                  height: 38,
                  borderRadius: 12,
                  padding: '0 8px 0 12px',
                  fontSize: 13.5,
                  flex: 'none',
                  boxSizing: 'border-box',
                  gap: 8,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                  style={{ flex: 'none' }}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <span className="cut" style={{ flex: 1, minWidth: 0, color: 'var(--muted)' }}>
                  Search company, role, location
                </span>
                <KbdKey>/</KbdKey>
              </div>
            </div>
            <div
              className="row nw"
              style={{
                flex: 1,
                gap: 6,
                minWidth: 0,
                overflow: 'hidden',
                justifyContent: 'flex-end',
                WebkitMaskImage: 'linear-gradient(90deg,#000 calc(100% - 40px),transparent)',
                maskImage: 'linear-gradient(90deg,#000 calc(100% - 40px),transparent)',
                paddingRight: 40,
                marginRight: -40,
                boxSizing: 'border-box',
              }}
            >
              {FILTERS.map((f, i) => (
                <span
                  key={f}
                  style={{
                    fontSize: 13,
                    border: '1px solid var(--line)',
                    borderRadius: 99,
                    padding: '6px 12px',
                    whiteSpace: 'nowrap',
                    ...(i === 0 ? { background: 'var(--pri)', color: 'var(--on-pri)', borderColor: 'var(--pri)' } : {}),
                  }}
                >
                  {f} 0
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              border: '1px solid var(--line)',
              borderRadius: 20,
              background: 'var(--bg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                flex: 'none',
                display: 'grid',
                gridTemplateColumns: GRID,
                fontSize: 13.5,
                borderBottom: '1px solid var(--line)',
              }}
            >
              {COLUMNS.map((c) => (
                <div key={c} className="spec" style={{ padding: '10px 8px', color: 'var(--muted)' }}>
                  {c}
                </div>
              ))}
            </div>
            {[0, 1, 2].map((i) => (
              <SkeletonRow key={i} />
            ))}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 150,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <div className="mv" style={{ position: 'relative', width: 440, height: 200 }}>
                <svg
                  width="440"
                  height="200"
                  viewBox="0 0 440 200"
                  style={{ position: 'absolute', inset: 0 }}
                  aria-hidden="true"
                >
                  <path
                    d="M -40 150 C 40 150 60 60 140 70 S 260 140 300 90 S 380 20 430 40"
                    fill="none"
                    stroke="var(--line-2)"
                    strokeWidth="2"
                    strokeDasharray="2 8"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="flypath"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 72,
                    height: 72,
                    margin: '-44px 0 0 -36px',
                    offsetRotate: '0deg',
                  }}
                >
                  <CapDartArt size={72} />
                </span>
              </div>
              <div
                className="bub a v17-rise"
                style={cssVars(
                  { '--d': '.3s' },
                  { fontSize: 16, display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'center' },
                )}
              >
                Paste a job link to start · <KbdKey>⌘</KbdKey>
                <KbdKey>V</KbdKey>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 48,
                background: 'linear-gradient(transparent,var(--bg))',
                pointerEvents: 'none',
              }}
            />
          </div>
          <div className="row sp nw" style={{ gap: 16, flex: 'none' }}>
            <span className="s" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              Showing 0 of 0
            </span>
            <div className="row nw" style={{ gap: 8 }}>
              <span
                className="row nw"
                style={{
                  gap: 6,
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  fontSize: 13,
                  color: 'var(--ink-2)',
                }}
              >
                10 per page
              </span>
              <span className="row" style={{ ...pageBtn, opacity: 0.4 }}>
                ‹
              </span>
              <span
                className="row"
                style={{ ...pageBtn, background: 'var(--pri)', color: 'var(--on-pri)', borderColor: 'var(--pri)' }}
              >
                1
              </span>
              <span className="row" style={{ ...pageBtn, opacity: 0.4 }}>
                ›
              </span>
            </div>
          </div>
        </div>
        <aside style={{ width: 340, flex: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="mcell" style={{ gap: 14, padding: 24 }}>
            <div className="row nw" style={{ gap: 18 }}>
              <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true" style={{ flex: 'none' }}>
                <circle cx="52" cy="52" r="40" fill="none" stroke="var(--line)" strokeWidth="8" />
                <circle
                  className="v17-ring"
                  cx="52"
                  cy="52"
                  r="40"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset="0"
                  transform="rotate(-90 52 52)"
                />
                <text x="52" y="58" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink)">
                  {total}/{total}
                </text>
              </svg>
              <div>
                <div className="eyebrow">Setup</div>
                <b style={{ fontSize: 18 }}>
                  {total} of {total} done
                </b>
                <div className="s" style={{ fontSize: 13 }}>
                  Up next {total} · Mercury being filled now
                </div>
              </div>
            </div>
            {SETUP_CHECKLIST.map((item) => (
              <ChecklistRow key={item.title} item={item} compact />
            ))}
          </div>
          <div className="mcell" style={{ gap: 10, padding: '22px 24px' }}>
            <div className="eyebrow">What happens next</div>
            <div className="s" style={{ lineHeight: 1.6, fontSize: 14 }}>
              Cap reads the link and fills the form from your profile. You approve the send. The row appears here with
              its status.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
