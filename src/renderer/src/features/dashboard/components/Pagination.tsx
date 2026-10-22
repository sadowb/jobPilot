import { cx } from '../../../components/ui';
import { V17Kbd } from '../../../components/V17Kbd';

const cell =
  'flex size-8 items-center justify-center rounded-[10px] border text-[13px] font-semibold tabular-nums';

/**
 * Footer: range text and the pager. Sample data holds one page, so the pager only navigates what exists;
 * `totalPages > 1` draws the board's "1 2 3 … 7" run (pages beyond the first have no rows yet).
 */
export function Pagination({
  from,
  to,
  total,
  perPage,
  totalPages,
}: {
  from: number;
  to: number;
  total: number;
  perPage: number;
  totalPages: number;
}) {
  const more = totalPages > 1;
  return (
    <div className="flex flex-nowrap items-center justify-between gap-4">
      <span className="text-[13px] text-muted tabular-nums">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex flex-nowrap items-center gap-2">
        <span className="flex h-8 flex-nowrap items-center gap-1.5 rounded-[10px] border border-line px-3 text-[13px] text-ink-2">
          {perPage} per page{' '}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="flex-none"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span className="w-2" />
        <span className={cx(cell, 'border-line bg-bg text-ink opacity-35')} aria-disabled="true">
          ‹
        </span>
        <span className={cx(cell, 'border-pri bg-pri text-on-pri')} aria-current="page">
          1
        </span>
        {more ? (
          <>
            <span className={cx(cell, 'border-line bg-bg text-ink')}>2</span>
            <span className={cx(cell, 'border-line bg-bg text-ink')}>3</span>
            <span className="flex h-8 w-5 items-center justify-center text-[13px] text-muted">…</span>
            <span className={cx(cell, 'border-line bg-bg text-ink')}>{totalPages}</span>
            <span className={cx(cell, 'border-line bg-bg text-ink')}>›</span>
          </>
        ) : (
          <span className={cx(cell, 'border-line bg-bg text-ink opacity-35')} aria-disabled="true">
            ›
          </span>
        )}
        <span className="w-2" />
        <span className="flex flex-nowrap items-center gap-1 text-xs text-muted">
          <V17Kbd>[</V17Kbd>
          <V17Kbd>]</V17Kbd>
          <span className="ml-1">page</span>
        </span>
      </div>
    </div>
  );
}
