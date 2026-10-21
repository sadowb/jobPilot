import type { ReactNode } from 'react';

/** Keycap exactly as the V17 boards draw it inline (mono 11px, 2px bottom border, radius 5). */
export function KbdKey({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        border: '1px solid var(--line-2)',
        borderBottomWidth: 2,
        borderRadius: 5,
        padding: '1px 6px',
        background: 'var(--bg)',
      }}
    >
      {children}
    </kbd>
  );
}
