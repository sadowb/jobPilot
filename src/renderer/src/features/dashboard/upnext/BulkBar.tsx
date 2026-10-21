import type { CSSProperties } from 'react';
import { V17Kbd } from '../../../components/V17Kbd';

const action: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 12px',
  borderRadius: 99,
  whiteSpace: 'nowrap',
  fontSize: 13.5,
};

/** Floating toolbar for the current selection: Remove, Hold, Move to top; Esc clears. */
export function BulkBar({
  count,
  onRemove,
  onHold,
  onMoveToTop,
}: {
  count: number;
  onRemove: () => void;
  onHold: () => void;
  onMoveToTop: () => void;
}) {
  return (
    <div
      className="row nw uq-bulk"
      role="toolbar"
      aria-label={`${count} selected`}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 28,
        transform: 'translateX(-50%)',
        gap: 4,
        height: 48,
        boxSizing: 'border-box',
        padding: '6px 6px 6px 20px',
        borderRadius: 99,
        background: 'var(--pri)',
        color: 'var(--on-pri)',
        boxShadow: 'var(--float)',
        fontSize: 13.5,
        whiteSpace: 'nowrap',
        zIndex: 3,
        width: 540,
      }}
    >
      <b style={{ fontWeight: 650, marginRight: 10 }}>{count} selected</b>
      <button type="button" style={action} onClick={onRemove}>
        Remove <V17Kbd>⌫</V17Kbd>
      </button>
      <button type="button" style={action} onClick={onHold}>
        Hold <V17Kbd>H</V17Kbd>
      </button>
      <button type="button" style={action} onClick={onMoveToTop}>
        Move to top <V17Kbd>⇧↑</V17Kbd>
      </button>
      <span style={{ ...action, opacity: 0.75, marginLeft: 'auto' }}>Esc clears</span>
    </div>
  );
}
