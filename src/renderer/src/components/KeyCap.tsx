import type { CSSProperties, ReactNode } from 'react';

// Inline values are the boards' own (jp8.css has no kbd rule for the Inbox family).
const KBD: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  border: '1px solid var(--line-2)',
  borderBottomWidth: 2,
  borderRadius: 5,
  padding: '1px 6px',
  background: 'var(--bg)',
};

/** Keyboard hint cap, as drawn on the V17 boards. */
export function KeyCap({ children }: { children: ReactNode }) {
  return <kbd style={KBD}>{children}</kbd>;
}
