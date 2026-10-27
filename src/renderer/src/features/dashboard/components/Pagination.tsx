import { useState } from 'react';
import { cn, Select } from '../../../components/ui';

const cell = 'flex size-8 items-center justify-center rounded-[10px] border text-[13px] font-semibold tabular-nums';

export const PAGE_SIZES = [10, 25, 50] as const;

/** Page state for a list of `total` rows. The page clamps when the list shrinks (filter, search, removal). */
export function usePaging(total: number) {
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [requested, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(requested, totalPages);
  return {
    page,
    size,
    totalPages,
    total,
    start: (page - 1) * size,
    setPage,
    setSize: (n: number) => {
      setSize(n);
      setPage(1);
    },
  };
}

/** Footer: range text, page-size select and the pager. Page sizes are fixed (10/25/50), never derived from the rows. */
export function Pagination({ paging }: { paging: ReturnType<typeof usePaging> }) {
  const { page, size, totalPages, total, start, setPage, setSize } = paging;
  const from = total ? start + 1 : 0;
  const to = Math.min(start + size, total);
  const go = (n: number) => setPage(Math.min(Math.max(n, 1), totalPages));
  const nav = (disabled: boolean) => cn(cell, 'border-line bg-bg text-ink', disabled ? 'opacity-35' : 'cursor-pointer');
  return (
    <div className="flex flex-nowrap items-center justify-between gap-4">
      <span className="text-[13px] text-muted tabular-nums">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex flex-nowrap items-center gap-2">
        <Select
          size="sm"
          aria-label="Rows per page"
          className="w-auto flex-none"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </Select>
        <span className="w-2" />
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 1}
          className={nav(page === 1)}
          onClick={() => go(page - 1)}
        >
          ‹
        </button>
        {/* shortcut: every page gets a button, 500+ rows at 10 per page overflows; windowed run with "…" then */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Page ${n}`}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              cell,
              'cursor-pointer',
              n === page ? 'border-pri bg-pri text-on-pri' : 'border-line bg-bg text-ink',
            )}
            onClick={() => go(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={page === totalPages}
          className={nav(page === totalPages)}
          onClick={() => go(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
