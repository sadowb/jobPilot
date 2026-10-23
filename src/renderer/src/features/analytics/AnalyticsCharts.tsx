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
import { cn } from '../../components/ui';
import { V17X } from '../shared-ui';

const NUM = 'fill-ink-2 text-[13.5px]';
const MONO_NOTE = 'fill-muted font-mono text-[11.5px]';
const CHART = 'block overflow-visible';

export function FunnelChart({ stages, label }: { stages: readonly FunnelStage[]; label: string }) {
  const bars = funnelBars(stages);
  return (
    <svg viewBox="0 0 560 164" width="100%" role="img" aria-label={label} className={CHART}>
      {bars.map((b, i) => (
        <g key={b.label}>
          {b.value === 0 ? (
            <rect
              x={FUNNEL.trackX}
              y={b.y}
              width={FUNNEL.trackWidth}
              height={FUNNEL.rowHeight}
              rx="6"
              className="fill-none stroke-line-2 [stroke-dasharray:4_4]"
            />
          ) : (
            <rect
              x={FUNNEL.trackX}
              y={b.y}
              width={b.width}
              height={FUNNEL.rowHeight}
              rx="6"
              className={i === 0 ? 'fill-(--sage)' : 'fill-brand'}
            />
          )}
          <text x="0" y={b.y + 15} className={NUM}>
            {b.label}
          </text>
          <text x={b.labelX} y={b.y + 15} className="fill-ink text-[13.5px] font-[650]">
            {b.value}
          </text>
          <text x="556" y={b.y + 15} textAnchor="end" className={MONO_NOTE}>
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
    <svg viewBox="0 0 700 186" width="100%" role="img" aria-label={label} className={CHART}>
      <line x1="0" y1={LINE.baseline} x2="700" y2={LINE.baseline} className="stroke-line" />
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        className="fill-none stroke-brand stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
      />
      {pts.map((p, i) => (
        <g key={p.label}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === last ? 5 : 3}
            className={cn('stroke-brand stroke-2', i === last ? 'fill-brand' : 'fill-bg')}
          />
          <text x={p.x} y={p.y - LINE.labelRise} textAnchor="middle" className="fill-ink-2 text-[13px] font-semibold">
            {p.value}%
          </text>
        </g>
      ))}
      {pts.map((p) => (
        <text key={p.label} x={p.x} y="180" textAnchor="middle" className="fill-muted font-mono text-[11px]">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

const ROW_GRID = 'grid grid-cols-[minmax(0,1.15fr)_52px_52px_minmax(0,1.5fr)] gap-2.5';

export function RateTable({ rows }: { rows: readonly RateRow[] }) {
  return (
    <>
      <div className={cn(V17X, ROW_GRID, 'items-end pb-2')}>
        <span>Name</span>
        <span className="text-right">Applied</span>
        <span className="text-right">Replies</span>
        <span className="pl-3">Reply rate</span>
      </div>
      {rows.map((r) => {
        const pct = ratePercent(r.replies, r.applied);
        return (
          <div key={r.name} className={cn(ROW_GRID, 'items-center border-t border-line py-[7px] text-[13.5px]')}>
            <span className={cn('truncate', r.highlight ? 'font-[650] text-ink' : 'font-medium text-ink-2')}>
              {r.name}
            </span>
            <span className="text-right text-[13.5px] text-muted tabular-nums">{r.applied}</span>
            <span className="text-right text-[13.5px] text-muted tabular-nums">{r.replies}</span>
            <span className="flex min-w-0 items-center gap-2.5 pl-3">
              <b className="w-[38px] tabular-nums">{pct}%</b>
              <i className="block h-[5px] flex-1 overflow-hidden rounded-full bg-line">
                <i
                  className={cn('block h-[5px] rounded-full', r.highlight ? 'bg-brand' : 'bg-(--sage)')}
                  style={{ width: `${rateBarWidth(pct)}%` }}
                />
              </i>
            </span>
          </div>
        );
      })}
    </>
  );
}
