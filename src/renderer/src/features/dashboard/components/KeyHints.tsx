import { Fragment } from 'react';
import { V17Kbd } from '../../../components/V17Kbd';

export type HintMode = 'list' | 'peek' | 'status' | 'search-empty';

const HINTS: Record<HintMode, { keys: string[]; label: string }[]> = {
  list: [
    { keys: ['J', 'K'], label: 'move' },
    { keys: ['Space'], label: 'peek' },
    { keys: ['S'], label: 'status' },
    { keys: ['O'], label: 'open posting' },
    { keys: ['/'], label: 'search' },
    { keys: ['⌘K'], label: 'ask Cap' },
  ],
  peek: [
    { keys: ['J', 'K'], label: 'move' },
    { keys: ['Space'], label: 'close peek' },
    { keys: ['S'], label: 'status' },
    { keys: ['O'], label: 'open posting' },
    { keys: ['Esc'], label: 'close' },
  ],
  status: [
    { keys: ['↑', '↓'], label: 'move' },
    { keys: ['↵'], label: 'set status' },
    { keys: ['S'], label: 'status' },
    { keys: ['O'], label: 'open posting' },
    { keys: ['Esc'], label: 'close' },
  ],
  'search-empty': [
    { keys: ['/'], label: 'search' },
    { keys: ['Esc'], label: 'clear search' },
    { keys: ['⌘K'], label: 'ask Cap' },
  ],
};

/** The shortcut footer. Which hints show follows what is open, like the V17 footers. */
export function KeyHints({ mode }: { mode: HintMode }) {
  return (
    <div className="row nw s" style={{ gap: 18, fontSize: 12.5, flexWrap: 'wrap', marginTop: 'auto' }}>
      {HINTS[mode].map((h) => (
        <span key={h.label} className="row nw" style={{ gap: 6 }}>
          {h.keys.map((k, i) => (
            <Fragment key={i}>
              <V17Kbd>{k}</V17Kbd>
            </Fragment>
          ))}
          <span>{h.label}</span>
        </span>
      ))}
    </div>
  );
}
