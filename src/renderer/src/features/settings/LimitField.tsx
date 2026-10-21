import { useState } from 'react';
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
    <label style={{ minWidth: 0, display: 'block' }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, whiteSpace: 'nowrap' }}>{spec.label}</div>
      <div className="inp" style={{ height: 40, padding: '0 12px', justifyContent: 'space-between', borderRadius: 12 }}>
        <span className="row nw" style={{ gap: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {spec.prefix}
          <input
            inputMode="numeric"
            aria-label={`${spec.label} (${spec.unit})`}
            value={draft ?? String(value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            style={{
              width: `${Math.max(2, String(value).length + 1)}ch`,
              border: 0,
              outline: 0,
              background: 'transparent',
              padding: 0,
              font: 'inherit',
              color: 'inherit',
            }}
          />
        </span>
        <span className="s" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          {spec.unit}
        </span>
      </div>
    </label>
  );
}
