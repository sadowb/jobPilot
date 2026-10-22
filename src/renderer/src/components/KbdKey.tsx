import type { ReactNode } from 'react';
import { KBD_CLASS } from './kbdClass';

/** Keycap exactly as the V17 boards draw it inline (mono 11px, 2px bottom border, radius 5). */
export function KbdKey({ children }: { children: ReactNode }) {
  return <kbd className={KBD_CLASS}>{children}</kbd>;
}
