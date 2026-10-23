import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { AppButton } from './components/AppButton';
import { cn } from '../../components/ui';
import { V17Icon } from '../../components/V17Icon';
import { V17Kbd } from '../../components/V17Kbd';
import { Pagination } from './components/Pagination';
import { SearchField } from './components/SearchField';
import { TabSwitch, type DashboardTab } from './components/TabSwitch';
import { clockTime } from './format';
import { SAMPLE_TOTALS } from './sample';
import { BulkBar } from './upnext/BulkBar';
import {
  CREW_SIZE,
  formatCrewTime,
  minutesLeft,
  queueFilterCounts,
  queuePosition,
  visibleQueue,
  type QueueAction,
  type QueueFilter,
  type QueueState,
} from './upnext/queue';
import { actionTargets, queueKeyToResult } from './upnext/queueKeys';
import { QUEUE_GRID, QueueRow } from './upnext/QueueRow';
import { UndoToast } from './upnext/UndoToast';

const CHIPS: { key: QueueFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'waiting', label: 'Waiting on you' },
  { key: 'held', label: 'Held' },
  { key: 'Extension', label: 'Extension' },
  { key: 'Pasted', label: 'Pasted' },
  { key: 'Sheet', label: 'Sheet' },
];
const HEADERS = ['', '#', 'COMPANY · ROLE', 'SITE', 'EST.', 'FROM', ''] as const;

const isTextTarget = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export function UpNextView({
  state,
  dispatch,
  frozenNow,
  onTab,
  onOpenInbox,
  onAddJobs,
  modalOpen,
  addedIds = [],
}: {
  state: QueueState;
  dispatch: Dispatch<QueueAction>;
  /** Dev fixtures freeze the undo clock so the toast matches the board. */
  frozenNow?: number;
  onTab: (t: DashboardTab) => void;
  onOpenInbox: () => void;
  onAddJobs: () => void;
  modalOpen: boolean;
  addedIds?: string[];
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const dragId = useRef<string | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const now = frozenNow ?? tick;

  // Drive the undo countdown; expire the batch once its window has passed.
  const hasBatch = state.removed !== null;
  useEffect(() => {
    if (!hasBatch || frozenNow !== undefined) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setTick(t);
      dispatch({ type: 'expireUndo', now: t });
    }, 250);
    return () => window.clearInterval(id);
  }, [hasBatch, frozenNow, dispatch]);

  const rows = useMemo(() => visibleQueue(state), [state]);
  const counts = useMemo(() => queueFilterCounts(state.items), [state.items]);
  const running = state.items.filter((i) => i.stage === 'running').length;
  const minutes = minutesLeft(state.items);

  const remove = useCallback((ids: string[]) => dispatch({ type: 'remove', ids, now: Date.now() }), [dispatch]);
  const hold = useCallback((ids: string[]) => dispatch({ type: 'hold', ids, at: clockTime() }), [dispatch]);

  useEffect(() => {
    if (modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const res = queueKeyToResult(e, state, isTextTarget(e.target));
      if (!res) return;
      if (res.preventDefault) e.preventDefault();
      if (res.action) dispatch(res.action);
      if (res.effect === 'focusSearch') searchRef.current?.focus();
      else if (res.effect === 'blurSearch') searchRef.current?.blur();
      const targets = actionTargets(state);
      if (res.remove) remove(targets);
      if (res.hold) hold(targets);
      if (res.moveToTop) dispatch({ type: 'moveToTop', ids: targets });
      if (res.undo) dispatch({ type: 'undoRemove' });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, dispatch, remove, hold, modalOpen]);

  const crew = state.paused
    ? 'QUEUE PAUSED'
    : `CREW ${running} / ${CREW_SIZE} BUSY · ${formatCrewTime(minutes)} LEFT`.toUpperCase();

  return (
    <div className="relative flex h-[calc(100vh-var(--app-toolbar-height))]">
      <main className="box-border flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto px-14 pt-5 pb-[34px]">
        <div className="flex flex-nowrap items-end justify-between gap-3 [@media(width<=1194px)]:flex-wrap [@media(width<=1194px)]:gap-3.5">
          <div className="flex flex-nowrap items-center gap-[18px]">
            <h1 className="m-0 font-serif text-[42px] leading-[1.02] font-[350] tracking-[-0.025em]">Dashboard</h1>
            <TabSwitch
              active="up-next"
              appliedCount={SAMPLE_TOTALS.applied}
              upNextCount={state.items.length}
              onChange={onTab}
              className="flex-none"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-2.5">
            <span
              className="flex h-9 flex-nowrap items-center gap-2 rounded-full border border-line-2 px-3.5 font-mono text-[11.5px] tracking-[0.06em] whitespace-nowrap"
              role="status"
            >
              <i
                className={cn(
                  'inline-block size-[7px] rounded-full',
                  state.paused
                    ? 'bg-need'
                    : 'animate-jp-pulse bg-work motion-reduce:animate-none motion-reduce:opacity-100',
                )}
              />
              {crew}
            </span>
            <AppButton size="sm" onClick={() => dispatch({ type: 'togglePause' })}>
              <V17Icon name={state.paused ? 'play' : 'pause'} />
              {state.paused ? 'Resume queue ' : 'Pause queue '}
              <V17Kbd>P</V17Kbd>
            </AppButton>
            <AppButton variant="primary" size="sm" onClick={onAddJobs}>
              <V17Icon name="plus" />
              Add jobs <V17Kbd>⌘V</V17Kbd>
            </AppButton>
          </div>
        </div>
        <div className="-mt-1.5 text-[13.5px] text-muted">
          Up next is the order the crew opens jobs in. Remove or hold anything before it starts. Nothing is sent from
          here.
        </div>
        <div className="flex min-w-0 flex-nowrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
            <SearchField
              ref={searchRef}
              pill
              width={300}
              placeholder="Search company, role, site"
              value={state.query}
              onChange={(query) => dispatch({ type: 'query', query })}
            />
            <div
              role="group"
              aria-label="Filter queue"
              className="box-border flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden pr-10 [mask-image:linear-gradient(90deg,#000_calc(100%-40px),transparent)]"
            >
              {CHIPS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={state.filter === key}
                  className={cn(
                    'flex-none cursor-pointer rounded-full border px-[13px] py-1.5 text-[13px]! whitespace-nowrap',
                    state.filter === key
                      ? 'border-pri bg-pri text-on-pri!'
                      : 'border-line-2 bg-transparent text-ink-2!',
                  )}
                  onClick={() => dispatch({ type: 'filter', filter: key })}
                >
                  {label} {counts[key]}
                </button>
              ))}
            </div>
          </div>
          <span className="flex-none flex-nowrap text-[12.5px] text-muted">Sorted by crew order</span>
        </div>
        <div
          className="flex-none overflow-hidden rounded-3xl border border-line bg-bg"
          role="table"
          aria-label="Up next"
        >
          <div role="row" className={cn('grid items-center gap-x-3 border-b border-line bg-panel px-3.5', QUEUE_GRID)}>
            {HEADERS.map((h, i) => (
              <div
                key={i}
                role="columnheader"
                className="py-3 font-mono text-[11.5px] tracking-[0.06em] whitespace-nowrap text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {rows.length === 0 && (
            <div role="status" className="border-t border-line px-3.5 py-7 text-center text-[13.5px] text-muted">
              {state.items.length === 0 ? 'Nothing queued. Add jobs to start the crew.' : 'No queued jobs match.'}
            </div>
          )}
          {rows.map((item) => (
            <QueueRow
              added={addedIds.includes(item.id)}
              key={item.id}
              item={item}
              position={queuePosition(state.items, item.id)}
              selected={state.selected.includes(item.id)}
              cursor={state.cursor === item.id}
              onCursor={() => dispatch({ type: 'cursor', id: item.id })}
              onToggle={() => dispatch({ type: 'toggle', id: item.id })}
              onMoveToTop={() => dispatch({ type: 'moveToTop', ids: [item.id] })}
              onHold={() => hold([item.id])}
              onRemove={() => remove([item.id])}
              onOpenInbox={onOpenInbox}
              onDragStart={() => {
                dragId.current = item.id;
              }}
              onDropOn={() => {
                if (dragId.current) dispatch({ type: 'reorder', id: dragId.current, beforeId: item.id });
                dragId.current = null;
              }}
            />
          ))}
        </div>
        <Pagination from={rows.length ? 1 : 0} to={rows.length} total={rows.length} perPage={10} totalPages={1} />
      </main>
      {state.removed && <UndoToast batch={state.removed} now={now} onUndo={() => dispatch({ type: 'undoRemove' })} />}
      {state.selected.length > 0 && (
        <BulkBar
          count={state.selected.length}
          onRemove={() => remove(state.selected)}
          onHold={() => hold(state.selected)}
          onMoveToTop={() => dispatch({ type: 'moveToTop', ids: state.selected })}
        />
      )}
    </div>
  );
}
