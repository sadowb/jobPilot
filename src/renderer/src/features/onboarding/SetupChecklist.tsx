import { cssVars } from '../../lib/css-vars';
import type { ChecklistItem } from './data';

const CHECK = (
  <svg
    width="12"
    height="12"
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
);

/** One done row of the setup checklist. `compact` is the dashboard's side-card density; otherwise the Liftoff step's. */
export function ChecklistRow({ item, delay, compact }: { item: ChecklistItem; delay?: string; compact?: boolean }) {
  const common = { gap: compact ? 12 : 14, padding: compact ? '12px 0' : '6px 0', borderTop: '1px solid var(--line)' };
  return (
    <div className={delay ? 'row nw v17-rise' : 'row nw'} style={delay ? cssVars({ '--d': delay }, common) : common}>
      <span className="chk on" style={{ flex: 'none' }}>
        {CHECK}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: compact ? 14.5 : 15, fontWeight: 600 }}>{item.title}</div>
        <div className="s" style={{ fontSize: 13 }}>
          {compact ? (item.shortDetail ?? item.detail) : item.detail}
        </div>
      </div>
    </div>
  );
}
