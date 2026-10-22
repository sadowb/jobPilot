import { Eyebrow, cx } from '../../../components/ui';
import { AppButton } from './AppButton';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17Kbd } from '../../../components/V17Kbd';
import { V17MiniPaper } from '../../../components/V17MiniPaper';
import { V17StatusChip } from '../../../components/V17StatusChip';
import { longDate, shortDate } from '../format';
import { STATUS_META } from '../status';
import type { Application, TimelineEvent } from '../types';

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div className="min-w-0 border-t border-line pt-1 pb-[3px]">
      <div className="font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">{label}</div>
      <div className="mt-px truncate text-[13px] leading-[1.3]">{children}</div>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="flex flex-col gap-2">
      {events.map((ev, i) => (
        <div key={i} className="relative pl-5">
          {i < events.length - 1 && <i className="absolute top-[15px] -bottom-3 left-1 w-[1.5px] bg-line" />}
          <i
            className={cx(
              'absolute top-1.5 left-0 size-[9px] rounded-full shadow-[0_0_0_3px_var(--bg)]',
              ev.tone === 'screening' ? 'bg-[var(--st-teal-fg)]' : 'bg-muted',
            )}
          />
          <div className="flex flex-nowrap items-center justify-between gap-2.5 text-[13px] leading-5">
            <span className="truncate">{ev.title}</span>
            {ev.undoLabel && (
              <a href="#" className="text-[12px] whitespace-nowrap text-muted! underline!">
                {ev.undoLabel}
              </a>
            )}
          </div>
          <div className="text-[12px] leading-4 text-muted">
            {shortDate(ev.on)} · {ev.by === 'the agent' ? 'by the agent' : `set by ${ev.by}`}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Docked inspector for the selected application (400px, right of the table). It is the only place that shows
 * the exact CV that was sent, and the entry point to the full-size viewer.
 */
export function PeekPanel({
  app,
  position,
  total,
  canUndo,
  onClose,
  onUndo,
  onOpenCv,
  onOpenPosting,
}: {
  app: Application;
  position: number;
  total: number;
  canUndo: boolean;
  onClose: () => void;
  onUndo: () => void;
  onOpenCv: () => void;
  onOpenPosting: () => void;
}) {
  const meta = STATUS_META[app.status];
  const d = app.detail;
  const timeline: TimelineEvent[] =
    d.timeline.length > 0
      ? d.timeline
      : [{ title: `Submitted by the ${app.company} agent`, on: app.appliedOn, by: 'the agent', tone: 'neutral' }];
  return (
    <aside
      aria-label="Application peek"
      className="box-border flex min-h-0 w-[400px] flex-none animate-jp-peek-in flex-col motion-reduce:animate-none gap-2 overflow-hidden border-l border-line bg-bg px-6 pt-[18px] pb-6"
    >
      <div className="flex flex-none flex-nowrap items-center justify-between gap-3">
        <span className="font-mono text-[11.5px] tracking-[0.02em] text-muted">
          Peek · {position} of {total}
        </span>
        <span className="flex flex-nowrap items-center gap-2">
          <span className="flex flex-nowrap items-center gap-1 text-[12px] text-muted">
            <V17Kbd>J</V17Kbd>
            <V17Kbd>K</V17Kbd>
          </span>
          <button
            type="button"
            aria-label="Close peek"
            onClick={onClose}
            className="grid size-7 flex-none place-items-center rounded-full border-0 bg-hover p-0 text-[12px]! text-ink-2!"
          >
            ✕
          </button>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden [&>*]:flex-none">
        <div className="flex flex-nowrap items-center gap-3.5">
          <V17AgentBot name={app.company} state={app.agent} size={44} />
          <div className="min-w-0">
            <div className="font-serif text-[22px] leading-[1.15] font-normal tracking-[-0.015em]">{app.role}</div>
            <div className="mt-[3px] text-[13px] text-muted">
              {app.company} · {app.location} · {app.site}
            </div>
          </div>
        </div>
        <div>
          <div className="flex flex-nowrap items-center gap-2">
            <V17StatusChip className={meta.chipClass}>
              {meta.longLabel}
            </V17StatusChip>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="flex-none"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div className="mt-1.5 flex flex-nowrap items-center gap-2 text-[12.5px] text-muted">
            set by {app.statusSource} · {shortDate(app.statusSetOn)}
            <span className="flex-1" />
            {canUndo && (
              <AppButton size="sm" className="min-h-7! px-3! text-[12.5px]!" onClick={onUndo}>
                Undo
              </AppButton>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-5">
          <Fact label="Applied">{longDate(app.appliedOn)}</Fact>
          <Fact label="Location">{app.location}</Fact>
          <Fact label="Remote / on-site">{app.workMode}</Fact>
          <Fact label="Type">{d.jobType}</Fact>
          <Fact label="Level">{d.level}</Fact>
          <Fact label="Salary">{app.salary}</Fact>
          <Fact label="Applied via">{`JobPilot · ${app.site}`}</Fact>
          <Fact label="CV used">{d.cvName}</Fact>
          <Fact label="Follow up">{d.followUpOn ? shortDate(d.followUpOn) : '—'}</Fact>
          <Fact label="Sponsorship">{d.sponsorship}</Fact>
        </div>
        <div className="flex flex-nowrap items-center gap-3.5 rounded-[18px] border border-line py-2 pr-3 pl-2.5">
          <V17MiniPaper />
          <div className="flex min-w-0 flex-col items-start gap-[3px]">
            <div className="text-[13.5px] leading-[1.3] font-semibold">
              Sent {shortDate(app.appliedOn)} · {d.cvName}
            </div>
            <div className="text-[12px] text-muted">{d.cvMeta}</div>
            <div className="mt-1 flex flex-nowrap items-center gap-2">
              <AppButton variant="primary" size="sm" className="min-h-[30px]!" onClick={onOpenCv}>
                View full size
              </AppButton>
            </div>
            <a href="#" className="mt-0.5 text-[12.5px] text-ink-2! underline! underline-offset-[3px]">
              Compare with current
            </a>
          </div>
        </div>
        <div>
          <div className="mb-1 flex flex-nowrap items-center justify-between gap-3">
            <Eyebrow>About the job</Eyebrow>
            <a href="#" className="text-[12px] text-muted! underline!">
              Full description
            </a>
          </div>
          <div className="text-[12.5px] leading-[1.55] text-ink-2">{d.description}</div>
        </div>
        <div>
          <Eyebrow className="mb-1.5">Your notes</Eyebrow>
          <div
            className={cx(
              'flex h-[34px] min-w-0 items-center gap-2.5 rounded-xl border border-line-2 bg-bg px-3.5 text-[13px]',
              d.notes ? 'text-ink' : 'text-muted',
            )}
          >
            {d.notes || 'Add a note'}
          </div>
        </div>
        <div>
          <Eyebrow className="mb-2">Timeline</Eyebrow>
          <Timeline events={timeline} />
        </div>
      </div>
      <div className="flex flex-none flex-nowrap items-center gap-2 border-t border-line pt-2.5">
        <AppButton size="sm" className="min-w-0 flex-1" onClick={onOpenPosting}>
          Open posting · O
        </AppButton>
        <AppButton size="sm" className="min-w-0 flex-1">
          Answers sent
        </AppButton>
      </div>
    </aside>
  );
}
