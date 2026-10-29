import { useId, useState } from 'react';
import { cn } from '../../components/ui';
import { controlFocus } from '../../components/ui/controlStyles';
import { S } from '../shared-ui';
import { parseLimit, type LimitSpec } from './model';

/** One hard limit: a bold numeric field with its unit. Committed strictly: invalid input shows an error and is never saved. */
export function LimitField({
  spec,
  value,
  onChange,
}: {
  spec: LimitSpec;
  value: number;
  onChange: (next: number) => void;
}) {
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const parsed = parseLimit(draft, spec);
    if (!parsed.ok) return setError(parsed.error);
    setError(null);
    setDraft(null);
    if (parsed.value !== value) onChange(parsed.value);
  };
  return (
    <label className="block min-w-0">
      <div className="mb-1.5 text-[13px] font-semibold whitespace-nowrap">{spec.label}</div>
      <div
        className={cn(
          'flex h-10 min-w-0 items-center justify-between gap-2.5 rounded-xl border bg-bg px-3 text-[15px] text-ink',
          error ? 'border-bad' : 'border-line-2',
        )}
      >
        <span className="flex items-center font-semibold tabular-nums">
          {spec.prefix}
          <input
            inputMode="numeric"
            aria-label={`${spec.label} (${spec.unit})`}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            value={draft ?? String(value)}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className={cn('rounded-sm border-0 bg-transparent p-0', controlFocus)}
            style={{ width: `${Math.max(2, (draft ?? String(value)).length + 1)}ch` }}
          />
        </span>
        <span className={cn(S, 'text-[13px] whitespace-nowrap')}>{spec.unit}</span>
      </div>
      {error && (
        <div id={errorId} role="alert" className="mt-1 text-[12px] leading-[1.35] text-bad">
          {error}
        </div>
      )}
    </label>
  );
}
