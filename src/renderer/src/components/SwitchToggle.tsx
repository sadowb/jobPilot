import type { KeyboardEvent } from 'react';
import { cx } from './ui';

/** The boards' `.switch` (44×26, on = --brand) with switch semantics and Space/Enter toggling. */
export function SwitchToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  const key = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!on);
    }
  };
  return (
    <span
      className={cx(
        'relative block h-[26px] w-11 flex-none cursor-pointer rounded-full',
        on ? 'bg-brand' : 'bg-line-2',
      )}
      role="switch"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      onClick={() => onChange(!on)}
      onKeyDown={key}
    >
      <i className={cx('absolute top-[3px] block size-5 rounded-full bg-white', on ? 'left-[21px]' : 'left-[3px]')} />
    </span>
  );
}
