import '../../styles/v17-surfaces.css';

export interface Kpi {
  label: string;
  value: string;
  note: string;
}

/** Sample figures from the V17 boards (62 applications). */
export const KPIS: readonly Kpi[] = [
  { label: 'APPLIED', value: '62', note: '+9 this week' },
  { label: 'REPLY RATE', value: '11%', note: '7 of 62 heard back' },
  { label: 'INTERVIEWS', value: '1', note: 'Notion · Oct 23' },
  { label: 'AVG. TO REJECTION', value: '2.4 d', note: '12 rejections' },
];

/** Four-up metric strip shared by the Analytics board and the dashboard backdrop of the Settings board. */
export function KpiStrip() {
  return (
    <div className="v17c" style={{ display: 'flex', overflow: 'hidden', flex: 'none' }}>
      {KPIS.map((k, i) => (
        <div
          key={k.label}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '16px 24px',
            boxSizing: 'border-box',
            ...(i > 0 ? { borderLeft: '1px solid var(--line)' } : {}),
          }}
        >
          <div className="v17x">{k.label}</div>
          <div className="v17n" style={{ fontSize: 44, marginTop: 10 }}>
            {k.value}
          </div>
          <div className="s" style={{ fontSize: 13, marginTop: 8 }}>
            {k.note}
          </div>
        </div>
      ))}
    </div>
  );
}
