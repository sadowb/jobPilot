import type { CSSProperties } from 'react';
import { FILTER_CHIPS } from '../status';
import type { FilterCounts } from '../filter';
import type { StatusFilter } from '../types';

const chip: CSSProperties = {
  gap: 6,
  height: 32,
  padding: '0 12px',
  borderRadius: 99,
  border: '1px solid var(--line-2)',
  fontSize: 12.5,
  fontWeight: 550,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  color: 'var(--ink-2)',
};
const chipOn: CSSProperties = { ...chip, background: 'var(--pri)', color: 'var(--on-pri)', borderColor: 'var(--pri)' };

/** Status filter chips with live counts. The row scrolls when space is tight so every filter stays reachable. */
export function FilterChips({
  counts,
  active,
  onChange,
}: {
  counts: FilterCounts;
  active: StatusFilter;
  onChange: (f: StatusFilter) => void;
}) {
  return (
    <div role="group" aria-label="Filter by status" style={{ minWidth: 0, overflowX: 'auto', display: 'flex' }}>
      <div className="row nw" style={{ gap: 6, minWidth: 'max-content', padding: '3px' }}>
        {FILTER_CHIPS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className="row nw dash-chip"
            aria-pressed={active === key}
            style={active === key ? chipOn : chip}
            onClick={() => onChange(key)}
          >
            {label} <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{counts[key]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
