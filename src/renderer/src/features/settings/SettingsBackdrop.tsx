import { AgentBotArt } from '../../components/AgentBotArt';
import { SegmentedChoice } from '../../components/SegmentedChoice';
import { KpiStrip } from '../analytics/KpiStrip';
import { BACKDROP_ROWS, CHIP_TONES } from './data';

const GRID = 'minmax(0,1.7fr) 150px 110px 90px';
const ROW_GRID = { display: 'grid', gridTemplateColumns: GRID, gap: 12 } as const;
const VIEWS = [
  { value: 'applied', label: 'Applied' },
  { value: 'upnext', label: 'Up next' },
] as const;

const pageCell = {
  minWidth: 30,
  height: 30,
  display: 'inline-grid',
  placeItems: 'center',
  fontSize: 13,
} as const;

/** The dashboard as it sits behind the Settings sheet. Decorative: the live Dashboard screen owns the real table. */
export function SettingsBackdrop() {
  return (
    <div
      aria-hidden="true"
      inert
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '28px 40px 40px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div className="row nw" style={{ alignItems: 'center', gap: 16, flex: 'none' }}>
        <h1 className="h1" style={{ margin: 0 }}>
          Dashboard
        </h1>
        <SegmentedChoice label="View" options={VIEWS} value="applied" onChange={() => undefined} width={260} />
      </div>
      <div className="row sp nw" style={{ gap: 12, flex: 'none' }}>
        <div className="inp ph" style={{ height: 40, width: 340, borderRadius: 99 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          Search company, role, location · /
        </div>
        <span className="v17x">Newest first</span>
      </div>
      <KpiStrip />
      <div
        className="v17c"
        style={{ overflow: 'hidden', flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div className="v17x" style={{ ...ROW_GRID, padding: '12px 20px', flex: 'none' }}>
          <span>Company · role</span>
          <span>Status</span>
          <span>Site</span>
          <span>Applied ↓</span>
        </div>
        {BACKDROP_ROWS.map((r) => (
          <div
            key={r.company}
            className="v17hair"
            style={{ ...ROW_GRID, alignItems: 'center', padding: '10px 20px', flex: 'none' }}
          >
            <div className="row nw" style={{ gap: 12, minWidth: 0 }}>
              <AgentBotArt company={r.company} state={r.bot} size={32} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.company}</div>
                <div
                  className="s"
                  style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {r.role}
                </div>
              </div>
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 600,
                ...CHIP_TONES[r.tone],
                borderRadius: 99,
                padding: '3px 10px',
                whiteSpace: 'nowrap',
              }}
            >
              {r.status}
            </span>
            <span className="s">{r.site}</span>
            <span className="s">{r.applied}</span>
          </div>
        ))}
        <div
          className="row sp nw"
          style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', gap: 12, flex: 'none', marginTop: 'auto' }}
        >
          <span className="s" style={{ fontSize: 13 }}>
            Showing 1–10 of 62
          </span>
          <div className="row nw" style={{ gap: 2 }}>
            <span style={{ ...pageCell, color: 'var(--muted)' }}>‹</span>
            {['1', '2', '3', '…', '7'].map((p, i) => (
              <span
                key={p}
                style={{
                  ...pageCell,
                  borderRadius: 8,
                  fontWeight: 600,
                  ...(i === 0 ? { background: 'var(--pri)', color: 'var(--on-pri)' } : { color: 'var(--ink-2)' }),
                }}
              >
                {p}
              </span>
            ))}
            <span style={{ ...pageCell, color: 'var(--ink-2)' }}>›</span>
          </div>
          <span className="row nw s" style={{ fontSize: 13, gap: 6 }}>
            10 per page
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
