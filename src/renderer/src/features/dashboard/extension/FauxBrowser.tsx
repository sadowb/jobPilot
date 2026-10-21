import type { CSSProperties, ReactNode } from 'react';
import { V17Icon } from '../../../components/V17Icon';

const dot: CSSProperties = { width: 11, height: 11, borderRadius: '50%', background: 'var(--line-2)' };
const filterChip: CSSProperties = {
  fontSize: 13,
  border: '1px solid var(--line-2)',
  borderRadius: 99,
  padding: '6px 13px',
  whiteSpace: 'nowrap',
  flex: 'none',
  color: 'var(--ink-2)',
};
const roleRow: CSSProperties = { padding: '16px 0', borderTop: '1px solid var(--line)', flex: 'none' };

const ROLES = [
  ['Software Engineer, New Grad', 'New York, NY · Engineering'],
  ['Backend Engineer, Early Career', 'New York, NY · Engineering'],
  ['Data Engineer, New Grad', 'New York, NY · Data'],
  ['Software Engineer, Payments', 'New York, NY · Engineering'],
  ['Senior Staff Engineer', 'Remote US · Engineering'],
  ['Account Executive', 'New York, NY · Sales'],
  ['Product Designer, Growth', 'New York, NY · Design'],
  ['Solutions Engineer, Public Sector', 'Washington, DC · Sales'],
] as const;

/** The JobPilot dart glyph used for the toolbar button, filled with the current colour. */
function ToolbarDart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 11.2 L21.5 2.5 L14.2 21.5 L11 13.4 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M11 13.4 L21.5 2.5" stroke="var(--bg)" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
      <circle cx="15.6" cy="8.6" r="1.9" fill="var(--bg)" />
      <circle cx="16.1" cy="8.3" r=".8" fill="currentColor" />
    </svg>
  );
}

/**
 * A mock browser window around a mock careers page (jobs.ashbyhq.com/ramp). Pure illustration of where the
 * extension lives: the toolbar button toggles the popup passed as children.
 */
export function FauxBrowser({
  badge,
  popupOpen,
  onTogglePopup,
  children,
}: {
  badge: number;
  popupOpen: boolean;
  onTogglePopup: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        border: '1px solid var(--line-2)',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'var(--bg)',
        boxShadow: 'var(--float)',
      }}
    >
      <div
        className="row nw"
        style={{
          gap: 14,
          height: 52,
          padding: '0 16px',
          background: 'var(--panel)',
          borderBottom: '1px solid var(--line)',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ display: 'flex', gap: 7 }}>
          <i style={dot} />
          <i style={dot} />
          <i style={dot} />
        </span>
        <span style={{ display: 'flex', gap: 14, color: 'var(--muted)', marginLeft: 6 }}>
          <V17Icon name="back" />
          <V17Icon name="forward" />
          <V17Icon name="reload" />
        </span>
        <div
          className="row nw"
          style={{
            flex: 1,
            maxWidth: 620,
            height: 34,
            padding: '0 14px',
            borderRadius: 99,
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            gap: 10,
            fontFamily: 'var(--mono)',
            fontSize: 12.5,
            color: 'var(--muted)',
            minWidth: 0,
          }}
        >
          <V17Icon name="lock" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            jobs.ashbyhq.com/<b style={{ fontWeight: 600, color: 'var(--ink)' }}>ramp</b>
          </span>
        </div>
        <button
          type="button"
          aria-label="JobPilot"
          aria-expanded={popupOpen}
          onClick={onTogglePopup}
          style={{
            marginLeft: 'auto',
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 11,
            background: 'var(--brand-tint)',
            border: '1px solid var(--brand)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--brand-text)',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <ToolbarDart />
          <span
            style={{
              position: 'absolute',
              top: -7,
              right: -7,
              minWidth: 20,
              height: 20,
              padding: '0 6px',
              borderRadius: 99,
              background: 'var(--pri)',
              color: 'var(--on-pri)',
              fontSize: 11,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            {badge}
          </span>
        </button>
      </div>
      <div
        style={{ position: 'relative', height: 612, overflow: 'hidden', padding: '30px 56px', boxSizing: 'border-box' }}
      >
        <div className="row sp nw">
          <span style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-.01em' }}>Ramp</span>
          <span className="s" style={{ fontSize: 13 }}>
            Teams · Benefits · Life
          </span>
        </div>
        <div className="row sp nw" style={{ marginTop: 26 }}>
          <div>
            <div className="eyebrow">Careers</div>
            <div className="h2" style={{ fontSize: 34, marginTop: 6 }}>
              Open roles
            </div>
          </div>
          <span className="s" style={{ fontSize: 13 }}>
            {badge} roles · Engineering, Sales, Data
          </span>
        </div>
        <div className="row nw" style={{ gap: 8, marginTop: 16 }}>
          <span style={{ ...filterChip, background: 'var(--pri)', color: 'var(--on-pri)', borderColor: 'var(--pri)' }}>
            Engineering
          </span>
          <span style={filterChip}>New York</span>
          <span style={filterChip}>Early career</span>
        </div>
        <div style={{ marginTop: 14, maxWidth: 820, display: 'flex', flexDirection: 'column' }}>
          {ROLES.map(([role, where]) => (
            <div key={role} className="row sp nw" style={roleRow}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{role}</div>
                <div className="s" style={{ fontSize: 13 }}>
                  {where}
                </div>
              </div>
              <span className="s" style={{ fontSize: 13 }}>
                View →
              </span>
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 56,
            background: 'linear-gradient(transparent,var(--bg))',
          }}
        />
        {children}
      </div>
    </div>
  );
}
