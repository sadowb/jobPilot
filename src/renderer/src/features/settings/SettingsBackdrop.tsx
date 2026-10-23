import { AgentBotArt } from '../../components/AgentBotArt';
import { Card, cn, Segmented } from '../../components/ui';
import { H1_STD, PILL, S, V17X } from '../shared-ui';
import { KpiStrip } from '../analytics/KpiStrip';
import { BACKDROP_ROWS } from './data';

const ROW_GRID = 'grid grid-cols-[minmax(0,1.7fr)_150px_110px_90px] gap-3';
const VIEWS = [
  { value: 'applied', label: 'Applied' },
  { value: 'upnext', label: 'Up next' },
] as const;

const PAGE_CELL = 'inline-grid h-[30px] min-w-[30px] place-items-center text-[13px]';
const CHIP_TONES = {
  rejected: 'text-[#B5412F] bg-[rgb(181_65_47/.14)]',
  screening: 'text-[#0F766E] bg-[rgb(15_118_110/.14)]',
  submitted: 'text-ink-2 bg-line',
  interview: 'text-[#B45309] bg-[rgb(180_83_9/.16)]',
  withdrawn: 'text-muted bg-line',
} as const;

/** The dashboard as it sits behind the Settings sheet. Decorative: the live Dashboard screen owns the real table. */
export function SettingsBackdrop() {
  return (
    <div aria-hidden="true" inert className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-hidden px-10 pt-7 pb-10">
      <div className="flex flex-none items-center gap-4">
        <h1 className={H1_STD}>Dashboard</h1>
        <Segmented label="View" options={VIEWS} value="applied" onChange={() => undefined} className="w-[260px]" />
      </div>
      <div className="flex flex-none items-center justify-between gap-3">
        <div className="flex h-10 w-[340px] min-w-0 items-center gap-2.5 rounded-full border border-line-2 bg-bg px-3.5 text-[15px] text-muted">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          Search company, role, location · /
        </div>
        <span className={V17X}>Newest first</span>
      </div>
      <KpiStrip />
      <Card className="flex min-h-0 flex-[1_1_0] flex-col overflow-hidden">
        <div className={cn(V17X, ROW_GRID, 'flex-none px-5 py-3')}>
          <span>Company · role</span>
          <span>Status</span>
          <span>Site</span>
          <span>Applied ↓</span>
        </div>
        {BACKDROP_ROWS.map((r) => (
          <div key={r.company} className={cn(ROW_GRID, 'flex-none items-center border-t border-line px-5 py-2.5')}>
            <div className="flex min-w-0 items-center gap-3">
              <AgentBotArt company={r.company} state={r.bot} size={32} />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{r.company}</div>
                <div className={cn(S, 'truncate text-[13px]')}>{r.role}</div>
              </div>
            </div>
            <span className={`${PILL} ${CHIP_TONES[r.tone]}`}>{r.status}</span>
            <span className="text-[13.5px] text-muted">{r.site}</span>
            <span className="text-[13.5px] text-muted">{r.applied}</span>
          </div>
        ))}
        <div className="mt-auto flex flex-none items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className={cn(S, 'text-[13px]')}>Showing 1–10 of 62</span>
          <div className="flex items-center gap-0.5">
            <span className={cn(PAGE_CELL, 'text-muted')}>‹</span>
            {['1', '2', '3', '…', '7'].map((p, i) => (
              <span
                key={p}
                className={cn(PAGE_CELL, 'rounded-lg font-semibold', i === 0 ? 'bg-pri text-on-pri' : 'text-ink-2')}
              >
                {p}
              </span>
            ))}
            <span className={cn(PAGE_CELL, 'text-ink-2')}>›</span>
          </div>
          <span className={cn(S, 'flex items-center gap-1.5 text-[13px]')}>
            10 per page
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </Card>
    </div>
  );
}
