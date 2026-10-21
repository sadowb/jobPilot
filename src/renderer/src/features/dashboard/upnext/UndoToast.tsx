import type { CSSProperties } from 'react';
import { V17Kbd } from '../../../components/V17Kbd';
import { UNDO_WINDOW_MS, type RemovedBatch } from './queue';

const ellipsis: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** Bottom toast after a removal: what went, Undo (⌘Z), seconds left and a draining bar. */
export function UndoToast({ batch, now, onUndo }: { batch: RemovedBatch; now: number; onUndo: () => void }) {
  const left = Math.max(0, UNDO_WINDOW_MS - (now - batch.at));
  const first = batch.entries[0]?.item;
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 88,
        zIndex: 3,
        width: 540,
        boxSizing: 'border-box',
        background: 'var(--bg)',
        border: '1px solid var(--line-2)',
        borderRadius: 16,
        boxShadow: 'var(--float)',
        overflow: 'hidden',
      }}
    >
      <div className="row nw" style={{ gap: 12, padding: '12px 16px', fontSize: 13.5 }}>
        <span style={ellipsis}>
          Removed{' '}
          {batch.entries.length === 1 && first ? (
            <>
              <b style={{ fontWeight: 650 }}>{first.company}</b> · {first.role}
            </>
          ) : (
            <b style={{ fontWeight: 650 }}>{batch.entries.length} jobs</b>
          )}
        </span>
        <button
          type="button"
          className="row nw"
          onClick={onUndo}
          style={{
            font: 'inherit',
            gap: 6,
            fontWeight: 650,
            color: 'var(--brand-text)',
            whiteSpace: 'nowrap',
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Undo <V17Kbd>⌘Z</V17Kbd>
        </button>
        <span className="s" style={{ fontFamily: 'var(--mono)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {Math.ceil(left / 1000)} s
        </span>
      </div>
      <div style={{ height: 2, background: 'var(--line)' }}>
        <i
          style={{
            display: 'block',
            height: 2,
            width: `${Math.floor((left / UNDO_WINDOW_MS) * 100)}%`,
            background: 'var(--brand)',
          }}
        />
      </div>
    </div>
  );
}
