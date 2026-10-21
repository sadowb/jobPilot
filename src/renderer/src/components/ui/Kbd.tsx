import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cx(
        'rounded-md border border-b-2 border-line-2 bg-bg px-1.5 py-px font-mono text-[11.5px] text-ink-2',
        className,
      )}
      {...rest}
    />
  );
}
