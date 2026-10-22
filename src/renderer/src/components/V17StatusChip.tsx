import type { ReactNode } from 'react';

/** Tinted pill (colours: `var(--st-bad|teal|amber-fg/bg)` for the themed tints, or any token). used for application status (table, peek, status picker). Colours come from the caller. */
export function V17StatusChip({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap"
      style={{ color: fg, background: bg }}
    >
      {children}
    </span>
  );
}
