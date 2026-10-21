import './v17-status.css';
import type { ReactNode } from 'react';

/** Tinted pill (colours: `var(--st-bad|teal|amber-fg/bg)` for the themed tints, or any token). used for application status (table, peek, status picker). Colours come from the caller. */
export function V17StatusChip({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 600,
        color: fg,
        background: bg,
        borderRadius: 99,
        padding: '3px 10px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
