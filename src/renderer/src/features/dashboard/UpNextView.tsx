import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch } from 'react';
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
import './components/dashboard.css';

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

const chip: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  border: '1px solid var(--line-2)',
  borderRadius: 99,
  padding: '6px 13px',
  whiteSpace: 'nowrap',
  flex: 'none',
  color: 'var(--ink-2)',
  background: 'transparent',
  cursor: 'pointer',
};
const chipOn: CSSProperties = { ...chip, background: 'var(--pri)', color: 'var(--on-pri)', borderColor: 'var(--pri)' };

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
}: {
  state: QueueState;
  dispatch: Dispatch<QueueAction>;
  /** Dev fixtures freeze the undo clock so the toast matches the board. */
  frozenNow?: number;
  onTab: (t: DashboardTab) => void;
  onOpenInbox: () => void;
  onAddJobs: () => void;
  modalOpen: boolean;
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
    <div className="dash-page">
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '20px 56px 34px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <div className="row sp nw" style={{ alignItems: 'flex-end' }}>
          <div className="row nw" style={{ gap: 18 }}>
            <h1 className="h1" style={{ fontSize: 42, margin: 0 }}>
              Dashboard
            </h1>
            <TabSwitch
              active="up-next"
              appliedCount={SAMPLE_TOTALS.applied}
              upNextCount={state.items.length}
              onChange={onTab}
              style={{ flex: 'none' }}
            />
          </div>
          <div className="row nw" style={{ gap: 10 }}>
            <span
              className="row nw"
              role="status"
              style={{
                gap: 8,
                height: 36,
                padding: '0 14px',
                border: '1px solid var(--line-2)',
                borderRadius: 99,
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                letterSpacing: '.06em',
                whiteSpace: 'nowrap',
              }}
            >
              <i
                className={state.paused ? undefined : 'uq-pulse'}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: state.paused ? 'var(--need)' : 'var(--work)',
                  display: 'inline-block',
                }}
              />
              {crew}
            </span>
            <button className="btn sm" type="button" onClick={() => dispatch({ type: 'togglePause' })}>
              <V17Icon name={state.paused ? 'play' : 'pause'} />
              {state.paused ? 'Resume queue ' : 'Pause queue '}
              <V17Kbd>P</V17Kbd>
            </button>
            <button className="btn sm pri" type="button" onClick={onAddJobs}>
              <V17Icon name="plus" />
              Add jobs <V17Kbd>⌘V</V17Kbd>
            </button>
          </div>
        </div>
        <div className="s" style={{ marginTop: -6, fontSize: 13.5 }}>
          Up next is the order the crew opens jobs in. Remove or hold anything before it starts. Nothing is sent from
          here.
        </div>
        <div className="row sp nw" style={{ gap: 16, minWidth: 0 }}>
          <div className="row nw" style={{ gap: 8, minWidth: 0, flex: 1 }}>
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
              className="row nw"
              style={{
                gap: 8,
                minWidth: 0,
                overflow: 'hidden',
                paddingRight: 40,
                boxSizing: 'border-box',
                WebkitMaskImage: 'linear-gradient(90deg,#000 calc(100% - 40px),transparent)',
                maskImage: 'linear-gradient(90deg,#000 calc(100% - 40px),transparent)',
              }}
            >
              {CHIPS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={state.filter === key}
                  style={state.filter === key ? chipOn : chip}
                  onClick={() => dispatch({ type: 'filter', filter: key })}
                >
                  {label} {counts[key]}
                </button>
              ))}
            </div>
          </div>
          <span className="s nw" style={{ fontSize: 12.5, flex: 'none' }}>
            Sorted by crew order
          </span>
        </div>
        <div className="tbl" role="table" aria-label="Up next" style={{ flex: 'none' }}>
          <div
            role="row"
            style={{
              display: 'grid',
              gridTemplateColumns: QUEUE_GRID,
              columnGap: 12,
              alignItems: 'center',
              padding: '0 14px',
              background: 'var(--panel)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            {HEADERS.map((h, i) => (
              <div
                key={i}
                role="columnheader"
                className="spec"
                style={{ padding: '12px 0', color: 'var(--muted)', whiteSpace: 'nowrap', letterSpacing: '.06em' }}
              >
                {h}
              </div>
            ))}
          </div>
          {rows.length === 0 && (
            <div
              role="status"
              className="s"
              style={{ padding: '28px 14px', textAlign: 'center', borderTop: '1px solid var(--line)' }}
            >
              {state.items.length === 0 ? 'Nothing queued. Add jobs to start the crew.' : 'No queued jobs match.'}
            </div>
          )}
          {rows.map((item) => (
            <QueueRow
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
