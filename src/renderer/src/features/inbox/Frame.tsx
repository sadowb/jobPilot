import type { ReactNode } from 'react';
import { KeyCap } from '../../components/KeyCap';

const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

/** Thread header bar: avatar + title/sub on the left, actions on the right. */
export function ThreadHeader({
  lead,
  title,
  sub,
  children,
}: {
  lead: ReactNode;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="row sp nw"
      style={{
        flex: 'none',
        gap: 16,
        padding: '16px 28px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        minWidth: 0,
      }}
    >
      <div className="row nw" style={{ gap: 12, minWidth: 0 }}>
        {lead}
        <div style={{ minWidth: 0 }}>
          <div className="t" style={ELLIPSIS}>
            {title}
          </div>
          <div className="s" style={{ fontSize: 12.5, ...ELLIPSIS }}>
            {sub}
          </div>
        </div>
      </div>
      <div className="row nw" style={{ gap: 8, flex: 'none' }}>
        {children}
      </div>
    </div>
  );
}

/** "You have control of …" bar above the thread while the owner drives. */
export function ControlBanner({ agent }: { agent: string }) {
  return (
    <div
      className="row nw"
      role="status"
      style={{ flex: 'none', gap: 12, padding: '12px 28px', background: 'var(--pri)', color: 'var(--on-pri)' }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--on-pri)',
          color: 'var(--pri)',
          flex: 'none',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 3l14 8-6 2-3 6z" />
        </svg>
      </span>
      <b style={{ fontSize: 14.5 }}>You have control of {agent} · its agent is paused</b>
      <span style={{ fontSize: 13, opacity: 0.75, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        The rest of the crew keeps working
      </span>
    </div>
  );
}

export interface Shortcut {
  keys: readonly string[];
  label: string;
}

export function ShortcutBar({ shortcuts }: { shortcuts: readonly Shortcut[] }) {
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '11px 24px',
        borderTop: '1px solid var(--line)',
        background: 'var(--bg)',
        fontSize: 12.5,
        color: 'var(--muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {shortcuts.map((s) => (
        <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {s.keys.map((k) => (
            <KeyCap key={k}>{k}</KeyCap>
          ))}
          {s.label}
        </span>
      ))}
    </div>
  );
}
