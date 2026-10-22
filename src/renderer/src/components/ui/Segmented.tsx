import { useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { controlFocus } from './controlStyles';
import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'children'
> {
  label?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className,
  ...rest
}: SegmentedProps<T>) {
  const radios = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.flatMap((option, i) => (!disabled && !option.disabled ? [i] : []));
  const selected = options.findIndex((option) => option.value === value);
  const tabStop = enabled.includes(selected) ? selected : enabled[0];
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? enabled[0]
        : event.key === 'End'
          ? enabled.at(-1)
          : enabled[(enabled.indexOf(index) + step + enabled.length) % enabled.length];
    const next = nextIndex === undefined ? undefined : options[nextIndex];
    if (next && nextIndex !== undefined) {
      onChange(next.value);
      radios.current[nextIndex]?.focus();
    }
  };
  return (
    <div
      className={cx(
        'grid auto-cols-fr grid-flow-col self-start gap-0.5 rounded-full border border-line bg-bg p-1',
        className,
      )}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(element) => {
            radios.current[index] = element;
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={disabled || option.disabled}
          tabIndex={index === tabStop ? 0 : -1}
          className={cx(
            'flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-0 px-3.5 py-[7px]',
            // The unlayered `.app button` and global `button` rules otherwise reset these.
            'font-sans! text-sm! leading-[1.45]! font-semibold! disabled:cursor-not-allowed disabled:opacity-50',
            option.value === value ? 'bg-pri text-on-pri!' : 'bg-transparent text-muted!',
            controlFocus,
          )}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => move(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
