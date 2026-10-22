import type { ReactNode } from 'react';
import { Kbd } from '../../components/ui';

/** Keyboard hint: matches the old Inbox key cap while using the shared UI primitive. */
export function KeyHint({ children }: { children: ReactNode }) {
  return <Kbd className="rounded-[5px]! text-[11px]!">{children}</Kbd>;
}
