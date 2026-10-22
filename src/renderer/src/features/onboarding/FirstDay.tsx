import { CapDartArt } from '../../components/CapDartArt';
import { KbdKey } from '../../components/KbdKey';
import { Button, Eyebrow, cx } from '../../components/ui';
import '../../styles/motion.css'; // keyframes only (`v17rise`, `v17ring`, `flypath`)
import { A_RISE, BUBBLE, CELL, H1, REDUCE_ALL, S, SPEC, shellButton } from '../shared-ui';
import { SETUP_CHECKLIST } from './data';
import { ChecklistRow } from './SetupChecklist';

/**
 * Dashboard on the first day (V17_On_Empty): shown at `/` while there are no applications.
 * Renders the page body only; the Dashboard screen supplies the top bar and decides when to show this.
 */

const KPIS = [
  { label: 'APPLIED', value: '0', note: 'Nothing sent yet' },
  { label: 'REPLY RATE', value: '—', note: 'Shows after 5 applications' },
  { label: 'INTERVIEWS', value: '0', note: 'Waiting on replies' },
  { label: 'AVG. TO REJECTION', value: '—', note: 'No data yet' },
] as const;

const FILTERS = ['All', 'Submitted', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
const COLUMNS = ['COMPANY · ROLE', 'LOCATION', 'STATUS', 'SALARY', 'SITE', 'APPLIED'] as const;
const GRID = 'grid grid-cols-[2.1fr_1.3fr_1.1fr_.9fr_.8fr_.6fr]';
const PAGE_CELL = 'flex size-8 items-center justify-center rounded-[10px] border border-line text-[13px]';
const SKELETON_BARS = ['70%', '46%', '60%', '50%', '34%'] as const;
const RING_C = 251.3;

const skel = (width: string) => (
  <i className="block h-2.5 rounded-md bg-line" style={{ width }} />
);

function SkeletonRow() {
  return (
    <div aria-hidden="true" className={cx('flex-none items-center border-t border-dashed border-line-2 text-[13.5px] opacity-55', GRID)}>
      <div className="flex min-w-0 items-center gap-3 px-2 py-3.5">
        <span className="size-[34px] flex-none rounded-full border-[1.5px] border-dashed border-line-2" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {skel('55%')}
          {skel('38%')}
        </div>
      </div>
      {SKELETON_BARS.map((w) => (
        <div key={w} className="px-2 py-3.5">
          {skel(w)}
        </div>
      ))}
    </div>
  );
}

export function FirstDay() {
  const total = SETUP_CHECKLIST.length;
  return (
    <div className={cx('box-border flex h-[calc(100vh-var(--app-toolbar-height))] min-h-[814px] px-10 pt-7 pb-12', REDUCE_ALL)}>
      <div className="flex h-full min-h-0 min-w-0 flex-1 items-stretch gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-none items-end justify-between gap-6">
            <div className="flex min-w-0 items-center gap-[18px]">
              <h1 className={cx(H1, 'text-[42px]')}>Dashboard</h1>
              <div className="inline-flex flex-none gap-0.5 rounded-full border border-line bg-bg p-1">
                <span className="flex items-center gap-2 rounded-full bg-pri px-3.5 py-[7px] text-sm font-semibold text-on-pri">
                  Applied <b className="rounded-full bg-[color-mix(in_srgb,var(--on-pri)_18%,transparent)] px-[7px] text-[12.5px]">0</b>
                </span>
                <span className="flex items-center gap-2 rounded-full px-3.5 py-[7px] text-sm font-semibold text-muted">
                  Up next <b className="rounded-full bg-hover px-[7px] text-[12.5px] text-ink-2">{total}</b>
                </span>
              </div>
            </div>
            <Button variant="primary" size="sm" className={cx('flex-none', shellButton('primary'))}>
              Add jobs
              <span className="ml-2 font-mono text-xs opacity-60">⌘V</span>
            </Button>
          </div>
          <div className="flex flex-none gap-3">
            {KPIS.map((k) => (
              <div key={k.label} className={cx(CELL, 'flex-1 gap-1 px-[18px] py-4')}>
                <span className={cx(SPEC, 'text-muted')}>{k.label}</span>
                <b className="text-[28px] font-semibold text-muted">{k.value}</b>
                <span className={cx(S, 'text-[13px]')}>{k.note}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-none items-center justify-between gap-4">
            <div className="flex-none">
              <div className="flex h-[38px] w-[264px] flex-none box-border items-center gap-2 rounded-xl border border-line-2 bg-bg px-3 text-[13.5px] text-ink">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="flex-none"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <span className="min-w-0 flex-1 truncate text-muted">Search company, role, location</span>
                <KbdKey>/</KbdKey>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 justify-end gap-1.5 overflow-hidden pr-10 -mr-10 [mask-image:linear-gradient(90deg,#000_calc(100%_-_40px),transparent)]">
              {FILTERS.map((f, i) => (
                <span
                  key={f}
                  className={cx(
                    'whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[13px]',
                    i === 0 && 'border-pri bg-pri text-on-pri',
                  )}
                >
                  {f} 0
                </span>
              ))}
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-line bg-bg">
            <div className={cx(GRID, 'flex-none border-b border-line text-[13.5px]')}>
              {COLUMNS.map((c) => (
                <div key={c} className={cx(SPEC, 'px-2 py-2.5 text-muted')}>
                  {c}
                </div>
              ))}
            </div>
            {[0, 1, 2].map((i) => (
              <SkeletonRow key={i} />
            ))}
            <div className="absolute inset-x-0 top-[150px] bottom-0 flex flex-col items-center justify-center gap-2">
              <div className="relative h-[200px] w-[440px]">
                <svg width="440" height="200" viewBox="0 0 440 200" className="absolute inset-0" aria-hidden="true">
                  <path
                    d="M -40 150 C 40 150 60 60 140 70 S 260 140 300 90 S 380 20 430 40"
                    fill="none"
                    stroke="var(--line-2)"
                    strokeWidth="2"
                    strokeDasharray="2 8"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute top-0 left-0 -mt-11 -ml-9 size-[72px] [offset-path:path('M_-40_150_C_40_150_60_60_140_70_S_260_140_300_90_S_380_20_430_40')] [offset-rotate:0deg] animate-[flypath_3.6s_cubic-bezier(.65,0,.35,1)_infinite] motion-reduce:animate-none motion-reduce:[offset-distance:100%]">
                  <CapDartArt size={72} />
                </span>
              </div>
              <div className={cx(BUBBLE, 'flex items-center gap-2.5 self-center px-4 py-3 text-base [--d:.3s]', A_RISE)}>
                Paste a job link to start · <KbdKey>⌘</KbdKey>
                <KbdKey>V</KbdKey>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(transparent,var(--bg))]" />
          </div>
          <div className="flex flex-none items-center justify-between gap-4">
            <span className={cx(S, 'text-[13px] tabular-nums')}>Showing 0 of 0</span>
            <div className="flex items-center gap-2">
              <span className="flex h-8 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[13px] text-ink-2">10 per page</span>
              <span className={cx(PAGE_CELL, 'opacity-40')}>‹</span>
              <span className={cx(PAGE_CELL, 'border-pri bg-pri text-on-pri')}>1</span>
              <span className={cx(PAGE_CELL, 'opacity-40')}>›</span>
            </div>
          </div>
        </div>
        <aside className="flex w-[340px] flex-none flex-col gap-4">
          <div className={cx(CELL, 'gap-3.5 p-6')}>
            <div className="flex gap-[18px]">
              <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true" className="flex-none">
                <circle cx="52" cy="52" r="40" fill="none" stroke="var(--line)" strokeWidth="8" />
                <circle
                  cx="52"
                  cy="52"
                  r="40"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset="0"
                  transform="rotate(-90 52 52)"
                  className="animate-[v17ring_0.9s_cubic-bezier(.2,.8,.2,1)_0.25s_both]"
                />
                <text x="52" y="58" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink)">
                  {total}/{total}
                </text>
              </svg>
              <div>
                <Eyebrow>Setup</Eyebrow>
                <b className="text-lg">{total} of {total} done</b>
                <div className={cx(S, 'text-[13px]')}>Up next {total} · Mercury being filled now</div>
              </div>
            </div>
            {SETUP_CHECKLIST.map((item) => (
              <ChecklistRow key={item.title} item={item} compact />
            ))}
          </div>
          <div className={cx(CELL, 'gap-2.5 px-6 py-[22px]')}>
            <Eyebrow>What happens next</Eyebrow>
            <div className={cx(S, 'text-sm leading-[1.6]')}>
              Cap reads the link and fills the form from your profile. You approve the send. The row appears here with
              its status.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
