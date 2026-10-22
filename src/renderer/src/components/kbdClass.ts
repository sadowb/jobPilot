// Key-cap chip: mono 11px, 1px border with a 2px bottom edge, radius 5. The global `kbd` rule (board.css) sets 11.5px / radius 6,
// which would beat plain utilities, so those two carry `!`.
export const KBD_CLASS =
  'rounded-[5px]! border border-b-2 border-line-2 bg-bg px-1.5 py-px font-mono text-[11px]! text-ink-2';
