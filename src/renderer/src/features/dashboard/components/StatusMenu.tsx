import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../components/ui';
import { V17StatusChip } from '../../../components/V17StatusChip';
import { STATUS_MENU_GROUPS, STATUS_META, STATUS_MENU_ORDER } from '../status';
import type { ApplicationStatus } from '../types';

/**
 * Status picker (S). A keyboard-driven listbox with live text filtering:
 * typing narrows the visible statuses, ↑↓ move the selection, ↵ sets, Esc closes.
 */
export function StatusMenu({
  current,
  cursor: externalCursor = 0,
  onPick,
  onClose,
}: {
  current: ApplicationStatus;
  cursor?: number;
  onPick: (s: ApplicationStatus) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [internalCursor, setInternalCursor] = useState<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Click outside closes it (the picker is a popover, not a modal).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const normalized = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    return STATUS_MENU_GROUPS.map((group) => ({
      heading: group.heading,
      statuses: group.statuses.filter((s) => {
        if (!normalized) return true;
        const meta = STATUS_META[s];
        return (
          s.toLowerCase().includes(normalized) ||
          meta.label.toLowerCase().includes(normalized) ||
          meta.longLabel.toLowerCase().includes(normalized)
        );
      }),
    })).filter((group) => group.statuses.length > 0);
  }, [normalized]);

  const flatStatuses = useMemo(() => visibleGroups.flatMap((g) => g.statuses), [visibleGroups]);
  const defaultIndex = STATUS_MENU_ORDER.indexOf(current);
  const cursor = internalCursor ?? (defaultIndex >= 0 ? defaultIndex : externalCursor);
  const activeIndex = flatStatuses.length === 0 ? -1 : Math.min(cursor, flatStatuses.length - 1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setInternalCursor(flatStatuses.length ? (cursor + 1) % flatStatuses.length : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setInternalCursor(flatStatuses.length ? (cursor - 1 + flatStatuses.length) % flatStatuses.length : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const picked = flatStatuses[activeIndex];
      if (picked) onPick(picked);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Set status"
      onClick={(e) => e.stopPropagation()}
      className="absolute top-[34px] -left-1.5 z-[6] box-border w-[272px] cursor-default rounded-2xl border border-line-2 bg-bg p-2.5 shadow-float"
    >
      <div className="mb-1.5 flex h-9 min-w-0 items-center gap-2 rounded-[10px] border border-ink bg-bg px-3 text-[13px] text-ink shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_14%,transparent)]">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
          className="flex-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus
          placeholder="Filter statuses…"
          aria-label="Filter statuses"
          className="w-full bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none"
          onChange={(e) => {
            setQuery(e.target.value);
            setInternalCursor(0);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      {visibleGroups.map((group) => (
        <div key={group.heading}>
          <div className="px-2 pt-2 pb-1 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
            {group.heading}
          </div>
          {group.statuses.map((s) => {
            const meta = STATUS_META[s];
            const active = flatStatuses[activeIndex] === s;
            return (
              <div
                key={s}
                role="option"
                aria-selected={s === current}
                className={cn(
                  'flex min-h-[34px] cursor-pointer flex-nowrap items-center gap-2 rounded-[10px] px-2',
                  active && 'bg-hover',
                )}
                onMouseEnter={() => setInternalCursor(flatStatuses.indexOf(s))}
                onClick={() => onPick(s)}
              >
                <V17StatusChip className={meta.chipClass}>{meta.longLabel}</V17StatusChip>
                <span className="flex-1" />
                {s === current && <span className="text-[12px] font-bold text-ink">✓</span>}
              </div>
            );
          })}
        </div>
      ))}
      {flatStatuses.length === 0 && (
        <div className="px-2 py-4 text-center text-[12.5px] text-muted">No matching status</div>
      )}
      <div className="mt-1.5 border-t border-line px-2 pt-2.5 pb-0.5 text-[11.5px] text-muted">
        ↑↓ move · ↵ set · email updates this too
      </div>
    </div>
  );
}
