import type { ReactNode } from 'react';
import { KBD_CLASS } from './kbdClass';

/** Key-cap chip used in shortcut hints and inputs (V17 `kbd`: 1px border, 2px bottom border, radius 5). */
export function V17Kbd({ children }: { children: ReactNode }) {
  return <kbd className={KBD_CLASS}>{children}</kbd>;
}
