import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { AppButton } from './components/AppButton';
import { cn } from '../../components/ui';
import { V17Icon } from '../../components/V17Icon';
import { V17Kbd } from '../../components/V17Kbd';
import { Pagination, usePaging } from './components/Pagination';
import { SearchField } from './components/SearchField';
import { panelId, tabId, TabSwitch, type DashboardTab } from './components/TabSwitch';
import { clockTime } from './format';
import { BulkBar } from './upnext/BulkBar';
import {
  useCancelRun,
  useConfirmPosting,
  useRuns,
  useRunsState,
  useSetRunsPaused,
  useSettings,
  useStartRun,
} from '../../lib/api';
import { CREW_DEFAULT } from '../../../../shared/dto';
import {
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
import { cancellableRuns, runErrorMessage } from './upnext/rowActions';
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
  appliedCount,
  dispatch,
  frozenNow,
  onTab,
  onOpenInbox,
  onAddJobs,
  modalOpen,
  addedIds = [],
}: {
  state: QueueState;
  appliedCount: number;
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
  const paging = usePaging(rows.length);
  const counts = useMemo(() => queueFilterCounts(state.items), [state.items]);
  const running = state.items.filter((i) => i.stage === 'running').length;
  const minutes = minutesLeft(state.items);

  const { data: runsState } = useRunsState();
  const paused = runsState?.paused ?? false;
  const setPaused = useSetRunsPaused();
  const togglePause = useCallback(() => setPaused.mutate(!paused), [setPaused, paused]);

  const startRun = useStartRun();
  const cancelRun = useCancelRun();
  const { data: runs } = useRuns();
  const cancelIds = useMemo(() => cancellableRuns(runs), [runs]);
  const [runError, setRunError] = useState<string | null>(null);
  const runBusy = startRun.isPending || cancelRun.isPending;
  // Main enforces the trust gate and the pause flag; a refusal arrives as a short message we show as-is.
  const start = useCallback(
    async (ids: string[]) => {
      setRunError(null);
      const results = await Promise.allSettled(ids.map((id) => startRun.mutateAsync(id)));
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) setRunError(runErrorMessage(failed.reason, 'Could not start the run.'));
    },
    [startRun],
  );
  const cancel = useCallback(
    (runId: string) => {
      setRunError(null);
      cancelRun.mutate(runId, { onError: (e) => setRunError(runErrorMessage(e, 'Could not cancel the run.')) });
    },
    [cancelRun],
  );

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
      if (res.togglePause) togglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, dispatch, remove, hold, modalOpen, togglePause]);

  const { data: settings } = useSettings();
  const confirmPosting = useConfirmPosting();
  const startable = state.items.filter((i) => state.selected.includes(i.id) && i.stage === 'queued').map((i) => i.id);
  const crewSize = settings?.crew ?? CREW_DEFAULT;

  const crew = paused
    ? 'QUEUE PAUSED'
    : running === 0
      ? `CREW IDLE · 0 / ${crewSize} RUNNING`
      : `CREW ${running} / ${crewSize} BUSY · ${formatCrewTime(minutes)} LEFT`.toUpperCase();

  return (
    <div className="relative flex h-[calc(100vh-var(--app-toolbar-height))]">
      <main className="box-border flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto px-14 pt-5 pb-[34px]">
        <div className="flex flex-nowrap items-end justify-between gap-3 [@media(width<=1194px)]:flex-wrap [@media(width<=1194px)]:gap-3.5">
          <div className="flex flex-nowrap items-center gap-[18px]">
            <h1 className="m-0 font-serif text-[42px] leading-[1.02] font-[350] tracking-[-0.025em]">Dashboard</h1>
            <TabSwitch
              active="up-next"
              appliedCount={appliedCount}
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
                  paused ? 'bg-need' : 'animate-jp-pulse bg-work motion-reduce:animate-none motion-reduce:opacity-100',
                )}
              />
              {crew}
            </span>
            <AppButton size="sm" onClick={togglePause}>
              <V17Icon name={paused ? 'play' : 'pause'} />
              {paused ? 'Resume queue ' : 'Pause queue '}
              <V17Kbd>P</V17Kbd>
            </AppButton>
            <AppButton variant="primary" size="sm" onClick={onAddJobs}>
              <V17Icon name="plus" />
              Add jobs <V17Kbd>⌘V</V17Kbd>
            </AppButton>
          </div>
        </div>
        <div
          role="tabpanel"
          id={panelId('dashboard', 'up-next')}
          aria-labelledby={tabId('dashboard', 'up-next')}
          className="contents"
        >
          {runsState?.reason === 'interrupted' || runsState?.reason === 'quit' ? (
            <div role="status" className="rounded-lg border border-line-2 px-3.5 py-2.5 text-[13.5px] text-ink-2">
              {runsState.reason === 'quit'
                ? 'Paused after JobPilot closed with jobs in progress. Resume when ready.'
                : 'Paused because JobPilot stopped unexpectedly with jobs in progress. Resume when ready.'}
            </div>
          ) : null}
          {runError ? (
            <div role="alert" className="rounded-lg border border-line-2 px-3.5 py-2.5 text-[13.5px] text-need">
              {runError}
              {runError.includes('unverified') ? ' Use “Looks right” on the row to confirm it.' : ''}
            </div>
          ) : null}
          {paused ? (
            <div role="status" className="-mt-1.5 text-[13.5px] text-muted">
              The queue is paused: Start queues a job, and it opens when you resume.
            </div>
          ) : null}
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
            <div
              role="row"
              className={cn('grid items-center gap-x-3 border-b border-line bg-panel px-3.5', QUEUE_GRID)}
            >
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
            {rows.slice(paging.start, paging.start + paging.size).map((item) => (
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
                onStart={() => void start([item.id])}
                onCancel={cancelIds.has(item.id) ? () => cancel(cancelIds.get(item.id)!) : undefined}
                runBusy={runBusy}
                onOpenInbox={onOpenInbox}
                onConfirm={(postingId) => confirmPosting(postingId)}
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
          <Pagination paging={paging} />
        </div>
      </main>
      {state.removed && <UndoToast batch={state.removed} now={now} onUndo={() => dispatch({ type: 'undoRemove' })} />}
      {state.selected.length > 0 && (
        <BulkBar
          count={state.selected.length}
          startable={startable.length}
          runBusy={runBusy}
          onStart={() => void start(startable)}
          onRemove={() => remove(state.selected)}
          onHold={() => hold(state.selected)}
          onMoveToTop={() => dispatch({ type: 'moveToTop', ids: state.selected })}
        />
      )}
    </div>
  );
}
