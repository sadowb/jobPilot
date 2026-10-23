import type { ReactNode } from 'react';
import { cn } from '../../../components/ui';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17StatusChip } from '../../../components/V17StatusChip';
import { shortDate } from '../format';
import { STATUS_META } from '../status';
import type { Application } from '../types';
import { Highlighted } from './Highlighted';

export const APPLICATION_GRID =
  'grid-cols-[minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1.25fr)_minmax(0,.95fr)_minmax(0,.9fr)_minmax(0,.7fr)]';

export function ApplicationRow({
  app,
  tokens,
  selected,
  onSelect,
  onOpenStatus,
  menu,
}: {
  app: Application;
  tokens: string[];
  selected: boolean;
  onSelect: () => void;
  onOpenStatus: () => void;
  /** The status picker, when it is open on this row. */
  menu?: ReactNode;
}) {
  const meta = STATUS_META[app.status];
  return (
    <div
      role="row"
      aria-selected={selected}
      data-row-id={app.id}
      className={cn(
        'grid min-h-[46px] cursor-pointer items-center gap-4 border-t border-line px-5 text-[13.5px] hover:bg-panel',
        APPLICATION_GRID,
        selected && 'bg-panel shadow-[inset_3px_0_0_var(--ink)]',
      )}
      onClick={onSelect}
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-3">
        <V17AgentBot name={app.company} state={app.agent} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] leading-tight font-semibold">
            <Highlighted text={app.company} tokens={tokens} />
          </div>
          <div className="truncate text-[12.5px] leading-[1.35] text-muted">
            <Highlighted text={app.role} tokens={tokens} />
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13.5px]">
          <Highlighted text={app.location} tokens={tokens} />
        </div>
        <div className="text-[12px] text-muted">
          <Highlighted text={app.workMode} tokens={tokens} />
        </div>
      </div>
      <span className="relative flex min-w-0 flex-nowrap items-center gap-1.5">
        <button
          type="button"
          className="flex min-w-0 flex-nowrap items-center gap-1.5 border-0 bg-transparent p-0"
          aria-label={`Status: ${meta.longLabel}. Change status`}
          aria-haspopup="listbox"
          onClick={(e) => {
            e.stopPropagation();
            onOpenStatus();
          }}
        >
          <V17StatusChip className={meta.chipClass}>{meta.label}</V17StatusChip>
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
        </button>
        {menu}
      </span>
      <span className="text-[13px] whitespace-nowrap text-ink-2">{app.salary}</span>
      <span className="truncate text-[13px] text-muted">{app.site}</span>
      <span className="text-[13px] whitespace-nowrap text-muted">{shortDate(app.appliedOn)}</span>
    </div>
  );
}
