import type { CSSProperties } from 'react';
import { V17Kbd } from '../../../components/V17Kbd';

const cell: CSSProperties = {
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 10,
  border: '1px solid var(--line)',
  fontSize: 13,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  background: 'var(--bg)',
  color: 'var(--ink)',
};
const cellOn: CSSProperties = { ...cell, background: 'var(--pri)', color: 'var(--on-pri)', borderColor: 'var(--pri)' };
const cellOff: CSSProperties = { ...cell, opacity: 0.35 };

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
    <div className="row sp nw" style={{ gap: 16 }}>
      <span className="s" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
        Showing {from}–{to} of {total}
      </span>
      <div className="row nw" style={{ gap: 8 }}>
        <span
          className="row nw"
          style={{
            gap: 6,
            height: 32,
            padding: '0 12px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
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
            style={{ flex: 'none' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span style={{ width: 8 }} />
        <span className="row" style={cellOff} aria-disabled="true">
          ‹
        </span>
        <span className="row" style={cellOn} aria-current="page">
          1
        </span>
        {more ? (
          <>
            <span className="row" style={cell}>
              2
            </span>
            <span className="row" style={cell}>
              3
            </span>
            <span
              className="row"
              style={{ justifyContent: 'center', width: 20, height: 32, fontSize: 13, color: 'var(--muted)' }}
            >
              …
            </span>
            <span className="row" style={cell}>
              {totalPages}
            </span>
            <span className="row" style={cell}>
              ›
            </span>
          </>
        ) : (
          <span className="row" style={cellOff} aria-disabled="true">
            ›
          </span>
        )}
        <span style={{ width: 8 }} />
        <span className="row nw s" style={{ gap: 4, fontSize: 12 }}>
          <V17Kbd>[</V17Kbd>
          <V17Kbd>]</V17Kbd>
          <span style={{ marginLeft: 4 }}>page</span>
        </span>
      </div>
    </div>
  );
}
