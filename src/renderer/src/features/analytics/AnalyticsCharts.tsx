import {
  FUNNEL,
  LINE,
  funnelBars,
  linePoints,
  ratePercent,
  rateBarWidth,
  type FunnelStage,
  type RateRow,
} from './model';

const NUM = { fill: 'var(--ink-2)', fontSize: '13.5px' } as const;
const MONO_NOTE = { fill: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '11.5px' } as const;

export function FunnelChart({ stages, label }: { stages: readonly FunnelStage[]; label: string }) {
  const bars = funnelBars(stages);
  return (
    <svg
      viewBox="0 0 560 164"
      width="100%"
      role="img"
      aria-label={label}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {bars.map((b, i) => (
        <g key={b.label}>
          {b.value === 0 ? (
            <rect
              x={FUNNEL.trackX}
              y={b.y}
              width={FUNNEL.trackWidth}
              height={FUNNEL.rowHeight}
              rx="6"
              style={{ fill: 'none', stroke: 'var(--line-2)', strokeDasharray: '4 4' }}
            />
          ) : (
            <rect
              x={FUNNEL.trackX}
              y={b.y}
              width={b.width}
              height={FUNNEL.rowHeight}
              rx="6"
              style={{ fill: i === 0 ? 'var(--sage)' : 'var(--brand)' }}
            />
          )}
          <text x="0" y={b.y + 15} style={NUM}>
            {b.label}
          </text>
          <text x={b.labelX} y={b.y + 15} style={{ fill: 'var(--ink)', fontSize: '13.5px', fontWeight: 650 }}>
            {b.value}
          </text>
          <text x="556" y={b.y + 15} textAnchor="end" style={MONO_NOTE}>
            {b.note}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ReplyRateChart({
  values,
  labels,
  label,
}: {
  values: readonly number[];
  labels: readonly string[];
  label: string;
}) {
  const pts = linePoints(values, labels);
  const last = pts.length - 1;
  return (
    <svg
      viewBox="0 0 700 186"
      width="100%"
      role="img"
      aria-label={label}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <line x1="0" y1={LINE.baseline} x2="700" y2={LINE.baseline} style={{ stroke: 'var(--line)' }} />
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        style={{
          fill: 'none',
          stroke: 'var(--brand)',
          strokeWidth: 2,
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
        }}
      />
      {pts.map((p, i) => (
        <g key={p.label}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === last ? 5 : 3}
            style={{ fill: i === last ? 'var(--brand)' : 'var(--bg)', stroke: 'var(--brand)', strokeWidth: 2 }}
          />
          <text
            x={p.x}
            y={p.y - LINE.labelRise}
            textAnchor="middle"
            style={{ fill: 'var(--ink-2)', fontSize: '13px', fontWeight: 600 }}
          >
            {p.value}%
          </text>
        </g>
      ))}
      {pts.map((p) => (
        <text
          key={p.label}
          x={p.x}
          y="180"
          textAnchor="middle"
          style={{ fill: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '11px' }}
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

const ROW_GRID = 'minmax(0,1.15fr) 52px 52px minmax(0,1.5fr)';

export function RateTable({ rows }: { rows: readonly RateRow[] }) {
  return (
    <>
      <div
        className="v17x"
        style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: 10, alignItems: 'end', paddingBottom: 8 }}
      >
        <span>Name</span>
        <span style={{ textAlign: 'right' }}>Applied</span>
        <span style={{ textAlign: 'right' }}>Replies</span>
        <span style={{ paddingLeft: 12 }}>Reply rate</span>
      </div>
      {rows.map((r) => {
        const pct = ratePercent(r.replies, r.applied);
        return (
          <div
            key={r.name}
            className="v17hair"
            style={{
              display: 'grid',
              gridTemplateColumns: ROW_GRID,
              gap: 10,
              alignItems: 'center',
              padding: '7px 0',
              fontSize: 13.5,
            }}
          >
            <span
              style={{
                fontWeight: r.highlight ? 650 : 500,
                color: r.highlight ? 'var(--ink)' : 'var(--ink-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.name}
            </span>
            <span className="s" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {r.applied}
            </span>
            <span className="s" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {r.replies}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, minWidth: 0 }}>
              <b style={{ width: 38, fontVariantNumeric: 'tabular-nums' }}>{pct}%</b>
              <i
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 99,
                  background: 'var(--line)',
                  overflow: 'hidden',
                  display: 'block',
                }}
              >
                <i
                  style={{
                    display: 'block',
                    height: 5,
                    width: `${rateBarWidth(pct)}%`,
                    borderRadius: 99,
                    background: r.highlight ? 'var(--brand)' : 'var(--sage)',
                  }}
                />
              </i>
            </span>
          </div>
        );
      })}
    </>
  );
}
