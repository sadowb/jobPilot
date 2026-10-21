import type { ReactNode } from 'react';

/** Key-cap chip used in shortcut hints and inputs (V17 `kbd`: 1px border, 2px bottom border, radius 5). */
export function V17Kbd({ children }: { children: ReactNode }) {
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
