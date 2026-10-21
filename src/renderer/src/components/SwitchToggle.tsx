import type { KeyboardEvent } from 'react';

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
      className={on ? 'switch on' : 'switch'}
      role="switch"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      onClick={() => onChange(!on)}
      onKeyDown={key}
      style={{ flex: 'none', cursor: 'pointer' }}
    >
      <i />
    </span>
  );
}
