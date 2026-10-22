import { SAMPLE_STATS } from '../sample';

/** The four KPI cells under the title (board `.mcell`, dashboard variant: radius 20, padding 12 18). */
export function MetricRow({
  stats = SAMPLE_STATS,
}: {
  stats?: readonly { label: string; value: string; sub: string }[];
}) {
  return (
    <div className="flex items-stretch gap-3">
      {stats.map((m) => (
        <div
          key={m.label}
          className="flex min-w-0 flex-1 flex-col gap-1 rounded-[20px] border border-line bg-bg px-[18px] py-3"
        >
          <span className="font-mono text-[11.5px] tracking-[0.06em] text-muted">{m.label}</span>
          <b className="font-serif text-[34px] leading-none font-normal tracking-[-0.02em]">{m.value}</b>
          <span className="text-[12.5px] text-muted">{m.sub}</span>
        </div>
      ))}
    </div>
  );
}
