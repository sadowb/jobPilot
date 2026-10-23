import type { HTMLAttributes } from 'react';
import { cn } from './cx';

/** `.card` / `.v17c`: 24px surface. Light cards sit on white, dark cards lift to `panel`. */
export function Card({
  tone = 'default',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: 'default' | 'panel' }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-3xl border border-line',
        tone === 'panel' ? 'bg-panel dark:bg-hover' : 'bg-bg dark:bg-panel',
        className,
      )}
      {...rest}
    />
  );
}
