import { cn } from './ui';
import type { ReactNode } from 'react';

/** Tinted status pill; its theme colors are Tailwind utilities backed by the design tokens. */
export function V17StatusChip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn('inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap', className)}
    >
      {children}
    </span>
  );
}
