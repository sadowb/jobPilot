import { useState } from 'react';
import { SegmentedChoice } from '../../components/SegmentedChoice';
import { AnalyticsPanel } from './AnalyticsPanel';
import { FunnelChart, RateTable, ReplyRateChart } from './AnalyticsCharts';
import {
  APPLICATIONS,
  BREAKDOWNS,
  FUNNEL_READ,
  FUNNEL_STAGES,
  RANGES,
  REPLY_READ,
  SPEND_LINE,
  WEEKLY_REPLY_RATE,
  WEEKS,
  type RangeValue,
} from './data';
import { KpiStrip } from './KpiStrip';

const RANGE_OPTIONS = RANGES.map(({ value, label }) => ({ value, label }));

/**
 * V17 Analytics. The range control only changes the caption: the sample data covers one 8-week window,
 * and a real query per range arrives with the analytics endpoint (docs/FRONTEND.md section 9).
 */
export function AnalyticsScreen({ onAsk }: { onAsk?: (topic: string) => void }) {
  const [range, setRange] = useState<RangeValue>('8w');
  const caption = RANGES.find((r) => r.value === range)?.caption ?? '';
  const [applied, replies, interviews, offers] = FUNNEL_STAGES.map((s) => s.value);
  return (
    <main
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '24px 40px 40px',
        boxSizing: 'border-box',
      }}
    >
      <div className="row sp nw" style={{ alignItems: 'flex-end', gap: 24, flex: 'none' }}>
        <div style={{ minWidth: 0 }}>
          <div className="v17x">Analytics · {caption}</div>
          <h1 className="h1" style={{ margin: '6px 0 0' }}>
            What’s <span className="it">working.</span>
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flex: 'none' }}>
          <SegmentedChoice label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} width={300} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {SPEND_LINE}
          </span>
        </div>
      </div>
      <KpiStrip />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 16, flex: '0 0 auto' }}>
        <AnalyticsPanel
          title="Funnel"
          sub={`Jobs that reached each stage · ${APPLICATIONS} applications`}
          read={FUNNEL_READ}
          onAsk={() => onAsk?.('funnel')}
        >
          <FunnelChart
            stages={FUNNEL_STAGES}
            label={`Funnel, jobs that reached each stage: ${applied} applied, ${replies} recruiter replies, ${interviews} interview, ${offers} offers`}
          />
        </AnalyticsPanel>
        <AnalyticsPanel
          title="Reply rate over time"
          sub="Recruiter replies ÷ all applications, end of each week. Rejections not counted."
          read={REPLY_READ}
          onAsk={() => onAsk?.('reply-rate')}
        >
          <ReplyRateChart
            values={WEEKLY_REPLY_RATE}
            labels={WEEKS}
            label={`Cumulative reply rate over ${WEEKS.length} weeks, from ${WEEKLY_REPLY_RATE[0]} percent to ${WEEKLY_REPLY_RATE[WEEKLY_REPLY_RATE.length - 1]} percent`}
          />
        </AnalyticsPanel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 16, flex: '0 0 auto' }}>
        {BREAKDOWNS.map((b) => (
          <AnalyticsPanel key={b.id} title={b.title} sub={b.sub} read={b.read} onAsk={() => onAsk?.(b.id)}>
            <RateTable rows={b.rows} />
          </AnalyticsPanel>
        ))}
      </div>
    </main>
  );
}
