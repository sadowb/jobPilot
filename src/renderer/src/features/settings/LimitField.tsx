import { useState } from 'react';
import { cn } from '../../components/ui';
import { S } from '../shared-ui';
import { parseLimit, type LimitSpec } from './model';

/** One hard limit: a bold numeric field with its unit. Typing is free-form; the value is clamped into range on commit. */
export function LimitField({
  spec,
  value,
  onChange,
}: {
  spec: LimitSpec;
  value: number;
  onChange: (next: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) onChange(parseLimit(draft, spec, value));
    setDraft(null);
  };
  return (
    <label className="block min-w-0">
      <div className="mb-1.5 text-[13px] font-semibold whitespace-nowrap">{spec.label}</div>
      <div className="flex h-10 min-w-0 items-center justify-between gap-2.5 rounded-xl border border-line-2 bg-bg px-3 text-[15px] text-ink">
        <span className="flex items-center font-semibold tabular-nums">
          {spec.prefix}
          <input
            inputMode="numeric"
            aria-label={`${spec.label} (${spec.unit})`}
            value={draft ?? String(value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className="border-0 bg-transparent p-0 outline-none focus-visible:outline-none!"
            style={{ width: `${Math.max(2, String(value).length + 1)}ch` }}
          />
        </span>
        <span className={cn(S, 'text-[13px] whitespace-nowrap')}>{spec.unit}</span>
      </div>
    </label>
  );
}
