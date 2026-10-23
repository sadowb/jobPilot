import { Card, cn } from '../../components/ui';
import { S, V17N, V17X } from '../shared-ui';

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
    <Card className="flex flex-none overflow-hidden">
      {KPIS.map((k, i) => (
        <div key={k.label} className={cn('min-w-0 flex-1 px-6 py-4', i > 0 && 'border-l border-line')}>
          <div className={V17X}>{k.label}</div>
          <div className={cn(V17N, 'mt-2.5 text-[44px]')}>{k.value}</div>
          <div className={cn(S, 'mt-2 text-[13px]')}>{k.note}</div>
        </div>
      ))}
    </Card>
  );
}
