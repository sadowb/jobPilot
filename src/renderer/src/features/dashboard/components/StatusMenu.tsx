import { useEffect, useRef } from 'react';
import { V17StatusChip } from '../../../components/V17StatusChip';
import { STATUS_MENU_GROUPS, STATUS_META, STATUS_MENU_ORDER } from '../status';
import type { ApplicationStatus } from '../types';

const heading = { padding: '8px 8px 4px', fontSize: 10.5, textTransform: 'uppercase' } as const;

/**
 * Status picker (S). A keyboard-driven listbox: ↑↓ move `cursor`, ↵ sets, Esc closes; the key handling lives
 * in keys.ts, this only renders. `current` gets the ✓; the cursor row gets the hover fill.
 */
export function StatusMenu({
  current,
  cursor,
  onPick,
  onClose,
}: {
  current: ApplicationStatus;
  cursor: number;
  onPick: (s: ApplicationStatus) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Click outside closes it (the picker is a popover, not a modal).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Set status"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 34,
        left: -6,
        zIndex: 6,
        width: 272,
        boxSizing: 'border-box',
        border: '1px solid var(--line-2)',
        borderRadius: 16,
        background: 'var(--bg)',
        boxShadow: 'var(--float)',
        padding: 10,
        cursor: 'default',
      }}
    >
      <div
        className="inp f"
        style={{ height: 36, borderRadius: 10, fontSize: 13, padding: '0 12px', gap: 8, marginBottom: 6 }}
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
        <span style={{ color: 'var(--muted)' }}>Type to jump…</span>
      </div>
      {STATUS_MENU_GROUPS.map((group) => (
        <div key={group.heading}>
          <div className="spec" style={heading}>
            {group.heading}
          </div>
          {group.statuses.map((s) => {
            const meta = STATUS_META[s];
            const active = STATUS_MENU_ORDER[cursor] === s;
            return (
              <div
                key={s}
                role="option"
                aria-selected={s === current}
                className="row nw"
                onClick={() => onPick(s)}
                style={{
                  gap: 8,
                  minHeight: 34,
                  padding: '0 8px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: active ? 'var(--hover)' : undefined,
                }}
              >
                <V17StatusChip fg={meta.fg} bg={meta.bg}>
                  {meta.longLabel}
                </V17StatusChip>
                <span style={{ flex: 1 }} />
                {s === current && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>✓</span>}
              </div>
            );
          })}
        </div>
      ))}
      <div
        className="s"
        style={{ fontSize: 11.5, padding: '10px 8px 2px', marginTop: 6, borderTop: '1px solid var(--line)' }}
      >
        ↑↓ move · ↵ set · email updates this too
      </div>
    </div>
  );
}
