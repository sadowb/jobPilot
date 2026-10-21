import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type StatusKind = 'work' | 'need' | 'done' | 'idle' | 'bad' | 'plain';

const kinds: Record<StatusKind, string> = {
  work: "bg-work-tint text-work before:content-['●']",
  need: "bg-need-tint text-need before:content-['◆']",
  done: "bg-hover text-ink before:content-['✓'] before:text-xs",
  idle: "bg-panel text-muted before:content-['○']",
  bad: "bg-bad-tint text-bad before:content-['▲']",
  plain: 'bg-transparent px-1 text-ink-2',
};

/** `.st` status pill: glyph + label, colour from the state token pair. */
export function Status({ kind, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { kind: StatusKind }) {
  return (
    <span
      className={cx(
        'inline-flex h-7 items-center gap-[7px] whitespace-nowrap rounded-full pr-3 pl-2.5 text-[13px] font-semibold',
        'before:text-[11px] before:leading-none',
        kinds[kind],
        className,
      )}
      {...rest}
    />
  );
}
