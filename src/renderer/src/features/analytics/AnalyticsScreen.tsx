import { useState } from 'react';
import { Segmented } from '../../components/ui';
import { H1_STD, IT, V17X } from '../shared-ui';
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
const RANGE_CONTROL = 'w-[300px] inline-flex! self-end! gap-0.5! [&>span]:rounded-full!';

/**
 * V17 Analytics. The range control only changes the caption: the sample data covers one 8-week window,
 * and a real query per range arrives with the analytics endpoint (docs/FRONTEND.md section 9).
 */
export function AnalyticsScreen({ onAsk }: { onAsk?: (topic: string) => void }) {
  const [range, setRange] = useState<RangeValue>('8w');
  const caption = RANGES.find((r) => r.value === range)?.caption ?? '';
  const [applied, replies, interviews, offers] = FUNNEL_STAGES.map((s) => s.value);
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-3.5 px-10 pt-6 pb-10">
      <div className="flex flex-none items-end justify-between gap-6">
        <div className="min-w-0">
          <div className={V17X}>Analytics · {caption}</div>
          <h1 className={`${H1_STD} mt-1.5`}>
            What’s <span className={IT}>working.</span>
          </h1>
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          <Segmented
            label="Range"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
            className={RANGE_CONTROL}
          />
          <span className="font-mono text-[13px] whitespace-nowrap text-muted">{SPEND_LINE}</span>
        </div>
      </div>
      <KpiStrip />
      <div className="grid flex-none grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
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
      <div className="grid flex-none grid-cols-3 gap-4">
        {BREAKDOWNS.map((b) => (
          <AnalyticsPanel key={b.id} title={b.title} sub={b.sub} read={b.read} onAsk={() => onAsk?.(b.id)}>
            <RateTable rows={b.rows} />
          </AnalyticsPanel>
        ))}
      </div>
    </main>
  );
}
