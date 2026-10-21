import type { HTMLAttributes } from 'react';
import { cx } from './cx';

const sizes = {
  sm: 'size-8 rounded-[10px] text-sm',
  md: 'size-10 rounded-[14px] text-base',
  lg: 'size-14 rounded-[18px] text-[22px]',
};

/** Monogram tile (company initial). */
export function Tile({
  size = 'md',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { size?: keyof typeof sizes }) {
  return (
    <span
      className={cx(
        'grid flex-none place-items-center border border-line bg-panel font-serif font-medium text-ink dark:bg-hover',
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
