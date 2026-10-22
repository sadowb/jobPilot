import type { ReactNode } from 'react';
import { KBD_CLASS } from './kbdClass';

/** Keyboard hint cap, as drawn on the V17 boards (jp8.css has no kbd rule for the Inbox family). */
export function KeyCap({ children }: { children: ReactNode }) {
  return <kbd className={KBD_CLASS}>{children}</kbd>;
}
