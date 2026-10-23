import type { HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './cx';

const tileStyles = cva(
  'grid flex-none place-items-center border border-line bg-panel font-serif font-medium text-ink dark:bg-hover',
  {
    variants: {
      size: {
        sm: 'size-8 rounded-[10px] text-sm',
        md: 'size-10 rounded-[14px] text-base',
        lg: 'size-14 rounded-[18px] text-[22px]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Monogram tile (company initial). */
export function Tile({
  size = 'md',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { size?: 'sm' | 'md' | 'lg' }) {
  return <span className={cn(tileStyles({ size }), className)} {...rest} />;
}
