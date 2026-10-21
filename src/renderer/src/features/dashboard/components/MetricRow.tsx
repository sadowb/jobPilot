import { SAMPLE_STATS } from '../sample';

/** The four KPI cells under the title (board `.mcell`, dashboard variant: radius 20, padding 12 18). */
export function MetricRow({
  stats = SAMPLE_STATS,
}: {
  stats?: readonly { label: string; value: string; sub: string }[];
}) {
  return (
    <div className="row nw" style={{ gap: 12, alignItems: 'stretch' }}>
      {stats.map((m) => (
        <div
          key={m.label}
          className="mcell"
          style={{ flex: 1, minWidth: 0, padding: '12px 18px', gap: 4, borderRadius: 20 }}
        >
          <span className="spec">{m.label}</span>
          <b
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 34,
              lineHeight: 1,
              letterSpacing: '-.02em',
            }}
          >
            {m.value}
          </b>
          <span className="s" style={{ fontSize: 12.5 }}>
            {m.sub}
          </span>
        </div>
      ))}
    </div>
  );
}
