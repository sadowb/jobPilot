import type { CSSProperties, KeyboardEvent } from 'react';
import { cn } from './ui';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * The boards' `.seg` pill control as an ARIA radio group: roving tabindex, arrow keys move the selection.
 * `fill` makes the segments equal-width, as the Settings, Profile and Analytics boards draw it.
 */
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  width,
  style,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  width?: number | string;
  style?: CSSProperties;
}) {
  const move = (e: KeyboardEvent, index: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (next) onChange(next.value);
  };
  return (
    <div
      className="grid auto-cols-[1fr] grid-flow-col gap-0.5 rounded-full border border-line bg-bg p-1"
      role="radiogroup"
      aria-label={label}
      style={{ width, ...style }}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <span
            key={o.value}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-2 rounded-full px-3.5 py-[7px] text-[14px] font-semibold whitespace-nowrap',
              on ? 'bg-pri text-on-pri' : 'text-muted',
            )}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => move(e, i)}
          >
            {o.label}
          </span>
        );
      })}
    </div>
  );
}
