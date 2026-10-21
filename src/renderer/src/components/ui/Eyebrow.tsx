import type { HTMLAttributes } from 'react';
import { cx } from './cx';

/** Mono caps label (`.eyebrow`, `.v17x`). */
export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('font-mono text-[11.5px] font-medium tracking-[0.08em] text-muted uppercase', className)}
      {...rest}
    />
  );
}
