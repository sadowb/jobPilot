import type { CSSProperties, ReactNode } from 'react';

interface IconDef {
  /** Fill-only glyphs (pause, grip) draw with `currentColor` fill and no stroke. */
  filled?: boolean;
  strokeWidth?: number;
  size?: number;
  body: ReactNode;
}

/** Inline stroke icons copied from the V17 boards (24×24 grid, round caps and joins). */
const ICONS = {
  lock: {
    body: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  pause: {
    filled: true,
    body: (
      <>
        <rect x="6" y="5" width="4" height="14" rx="1.2" />
        <rect x="14" y="5" width="4" height="14" rx="1.2" />
      </>
    ),
  },
  play: {
    filled: true,
    body: <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5z" />,
  },
  plus: { body: <path d="M12 5v14M5 12h14" /> },
  search: {
    body: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-4.2-4.2" />
      </>
    ),
  },
  arrowRight: {
    size: 13,
    strokeWidth: 2,
    body: (
      <>
        <path d="M5 12h13" />
        <path d="M13 7l5 5-5 5" />
      </>
    ),
  },
  check: { size: 12, strokeWidth: 2.6, body: <path d="M5 12.5l4.5 4.5L19 7.5" /> },
  moveTop: {
    body: (
      <>
        <path d="M5 4h14" />
        <path d="M12 20V10" />
        <path d="M7.5 13.5L12 9l4.5 4.5" />
      </>
    ),
  },
  close: { body: <path d="M6 6l12 12M18 6L6 18" /> },
  grip: {
    filled: true,
    body: (
      <>
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </>
    ),
  },
  back: { body: <path d="M15 6l-6 6 6 6" /> },
  forward: { body: <path d="M9 6l6 6-6 6" /> },
  reload: {
    body: (
      <>
        <path d="M20 11a8 8 0 1 0-2.3 5.7" />
        <path d="M20 4v7h-7" />
      </>
    ),
  },
} satisfies Record<string, IconDef>;

export type V17IconName = keyof typeof ICONS;

export function V17Icon({ name, size, style }: { name: V17IconName; size?: number; style?: CSSProperties }) {
  const def: IconDef = ICONS[name];
  const px = size ?? def.size ?? 16;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={def.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={def.filled ? 0 : (def.strokeWidth ?? 1.8)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block flex-none"
      style={style}
    >
      {def.body}
    </svg>
  );
}
