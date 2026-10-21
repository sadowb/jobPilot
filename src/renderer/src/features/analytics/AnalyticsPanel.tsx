import type { ReactNode } from 'react';
import { CapDartArt } from '../../components/CapDartArt';
import '../../styles/v17-surfaces.css';

/** Card with title, subtitle, an "Ask Cap about this" chip and a closing "Cap's read" line. */
export function AnalyticsPanel({
  title,
  sub,
  read,
  onAsk,
  children,
}: {
  title: string;
  sub: string;
  read: string;
  onAsk?: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className="v17c"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '18px 22px',
        boxSizing: 'border-box',
        minHeight: 0,
        flex: 'none',
        overflow: 'hidden',
      }}
    >
      <div className="row sp nw" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="row nw" style={{ gap: 8 }}>
            <b style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-.01em' }}>{title}</b>
          </div>
          <div className="s" style={{ fontSize: 13, marginTop: 3 }}>
            {sub}
          </div>
        </div>
        <button
          className="v17chip"
          type="button"
          aria-label="Ask Cap about this"
          onClick={onAsk}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 30,
            padding: '0 12px 0 3px',
            border: '1px solid var(--line-2)',
            borderRadius: 99,
            background: 'transparent',
            color: 'var(--ink-2)',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flex: 'none',
            cursor: 'pointer',
          }}
        >
          <CapDartArt size={24} /> Ask Cap about this
        </button>
      </div>
      {children}
      <div
        className="row nw"
        style={{
          gap: 10,
          marginTop: 'auto',
          paddingTop: 14,
          borderTop: '1px solid var(--line)',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--muted)',
        }}
      >
        <span className="v17x" style={{ color: 'var(--ink-2)', flex: 'none' }}>
          Cap’s read
        </span>
        <span>{read}</span>
      </div>
    </section>
  );
}
