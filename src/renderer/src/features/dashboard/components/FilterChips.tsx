import { cn } from '../../../components/ui';
import { FILTER_CHIPS } from '../status';
import type { FilterCounts } from '../filter';
import type { StatusFilter } from '../types';

const CHIP =
  'box-border flex h-8 flex-nowrap items-center gap-1.5 rounded-full border px-3 text-[12.5px]! font-[550]! whitespace-nowrap';
const CHIP_OFF = 'border-line-2 bg-transparent text-ink-2!';
const CHIP_ON = 'border-pri bg-pri text-on-pri!';

/** Status filter chips with live counts. The row wraps when space is tight so every filter stays reachable. */
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
    <div role="group" aria-label="Filter by status" className="flex min-w-0 flex-wrap items-center gap-1.5 p-[3px]">
      {FILTER_CHIPS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={cn(CHIP, active === key ? CHIP_ON : CHIP_OFF)}
          aria-pressed={active === key}
          onClick={() => onChange(key)}
        >
          {label} <span className="tabular-nums opacity-60">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}
