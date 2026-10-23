import { cn } from '../../../components/ui';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17Icon } from '../../../components/V17Icon';
import { isReorderable, type QueueItem } from './queue';

export const QUEUE_GRID = 'grid-cols-[36px_56px_minmax(0,2.6fr)_minmax(0,1.15fr)_80px_100px_184px]';

export interface QueueRowProps {
  item: QueueItem;
  /** 1-based place among queued jobs, when the job is queued. */
  position: number | null;
  selected: boolean;
  cursor: boolean;
  onCursor: () => void;
  onToggle: () => void;
  onMoveToTop: () => void;
  onHold: () => void;
  onRemove: () => void;
  onOpenInbox: () => void;
  onDragStart: () => void;
  onDropOn: () => void;
}

const stageTag = (item: QueueItem): { label: string; color: string } | null => {
  if (item.stage === 'running') return { label: 'NOW', color: 'text-work' };
  if (item.stage === 'waiting') return { label: 'WAIT', color: 'text-need' };
  if (item.stage === 'held') return { label: 'HOLD', color: 'text-need' };
  return null;
};

/** One Up next row. Running rows are locked; waiting rows hand off to Inbox; queued/held rows can be reordered. */
export function QueueRow(p: QueueRowProps) {
  const { item } = p;
  const running = item.stage === 'running';
  const draggable = isReorderable(item);
  const tag = stageTag(item);
  const showActions = (p.cursor || p.selected) && draggable;
  const iconBtn =
    'inline-grid size-[30px] flex-none cursor-pointer place-items-center rounded-[9px] border border-line bg-bg p-0 text-ink-2!';

  return (
    <div
      role="row"
      aria-selected={p.selected}
      className={cn(
        'grid min-h-[62px] items-center gap-x-3 border-t border-line px-3.5',
        QUEUE_GRID,
        running && 'bg-panel',
        !running && p.selected && 'bg-brand-tint shadow-[inset_3px_0_0_var(--brand)]',
        !running && !p.selected && p.cursor && 'bg-hover',
      )}
      draggable={draggable}
      onMouseEnter={p.onCursor}
      onDragStart={draggable ? p.onDragStart : undefined}
      onDragOver={draggable ? (e) => e.preventDefault() : undefined}
      onDrop={draggable ? p.onDropOn : undefined}
    >
      <div className="flex items-center">
        {running ? (
          <span className="grid place-items-center text-muted" title="Locked while running">
            <V17Icon name="lock" />
          </span>
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={p.selected}
            aria-label={`Select ${item.company}`}
            className={cn(
              'grid size-[18px] cursor-pointer place-items-center rounded-[5px] border-[1.5px] p-0 text-on-pri!',
              p.selected ? 'border-pri bg-pri' : 'border-line-2 bg-transparent',
            )}
            onClick={p.onToggle}
          >
            {p.selected && <V17Icon name="check" />}
          </button>
        )}
      </div>
      <div>
        {tag ? (
          <span className={cn('font-mono text-[11.5px] tracking-[0.06em]', tag.color)}>{tag.label}</span>
        ) : (
          <span className="text-[13.5px] text-muted tabular-nums">{p.position}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-nowrap items-center gap-3">
          <V17AgentBot name={item.company} state={item.agent} size={30} />
          <div className="flex min-w-0 flex-col items-start gap-1">
            <div className="text-[14.5px] font-semibold">{item.company}</div>
            <div className="max-w-full truncate text-[13px] text-muted">{item.role}</div>
            {item.stage === 'held' && item.heldAt && (
              <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-line-2 py-[3px] pr-[9px] pl-[7px] font-mono text-[11px] whitespace-nowrap text-ink-2">
                <i className="size-1.5 flex-none rounded-full bg-brand" />
                set by you · held {item.heldAt}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className="text-[13.5px] text-muted">{item.site}</span>
        {item.siteNote && <span className="text-[11.5px] text-need">{item.siteNote}</span>}
      </div>
      <div>
        <span className="text-[13px] text-muted">~{item.estimateMin} min</span>
      </div>
      <div>
        <span className="rounded-[7px] border border-line px-[7px] py-0.5 font-mono text-[11px] tracking-[0.06em] whitespace-nowrap text-ink-2">
          {item.source}
        </span>
      </div>
      <div className="flex items-center justify-end">
        {running && (
          <span className="flex flex-nowrap items-center gap-1.5 text-[12.5px] whitespace-nowrap text-muted">
            <V17Icon name="lock" />
            running · can’t remove
          </span>
        )}
        {item.stage === 'waiting' && (
          <span className="flex flex-nowrap items-center gap-2.5 whitespace-nowrap">
            <span className="inline-block rounded-full bg-[var(--st-amber-bg)] px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap text-[var(--st-amber-fg)]">
              {item.waitReason}
            </span>
            <button
              type="button"
              className="flex cursor-pointer flex-nowrap items-center gap-1 border-0 bg-transparent p-0 text-[12.5px]! font-semibold! text-brand-text!"
              onClick={p.onOpenInbox}
            >
              Inbox
              <V17Icon name="arrowRight" />
            </button>
          </span>
        )}
        {draggable && (
          <div className={cn('flex flex-nowrap items-center justify-end', showActions ? 'gap-1.5' : 'gap-0')}>
            {showActions && item.stage === 'queued' && (
              <button
                type="button"
                className={iconBtn}
                title="Move to top (⇧↑)"
                aria-label="Move to top (⇧↑)"
                onClick={p.onMoveToTop}
              >
                <V17Icon name="moveTop" />
              </button>
            )}
            {showActions && (
              <button
                type="button"
                className={iconBtn}
                title={item.stage === 'held' ? 'Resume (H)' : 'Hold (H)'}
                aria-label={item.stage === 'held' ? 'Resume (H)' : 'Hold (H)'}
                onClick={p.onHold}
              >
                <V17Icon name={item.stage === 'held' ? 'play' : 'pause'} />
              </button>
            )}
            {showActions && (
              <button type="button" className={iconBtn} title="Remove (⌫)" aria-label="Remove (⌫)" onClick={p.onRemove}>
                <V17Icon name="close" />
              </button>
            )}
            <span title="Drag to reorder" className="grid w-5 place-items-center text-muted">
              <V17Icon name="grip" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
