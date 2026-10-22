import { useCallback, useMemo, useRef, type Dispatch } from 'react';
import { Button } from '../../components/ui';
import { CvViewerDialog } from './components/CvViewerDialog';
import { ApplicationsTable } from './components/ApplicationsTable';
import { EmptyResults } from './components/EmptyResults';
import { FilterChips } from './components/FilterChips';
import { KeyHints, type HintMode } from './components/KeyHints';
import { MetricRow } from './components/MetricRow';
import { Pagination } from './components/Pagination';
import { PeekPanel } from './components/PeekPanel';
import { SearchField } from './components/SearchField';
import { TabSwitch, type DashboardTab } from './components/TabSwitch';
import { sentCvFor } from './cv';
import { countByFilter, type FilterCounts } from './filter';
import { SAMPLE_APPLICATIONS, SAMPLE_TOTALS } from './sample';
import { canUndo, selectedApp, visibleApps, type DashboardAction, type DashboardState } from './state';
import { STATUS_MENU_ORDER } from './status';
import { todayIso } from './format';
import type { KeyEffect } from './keys';
import type { ApplicationStatus } from './types';
import { useDashboardKeys } from './useDashboardKeys';

const BASE_COUNTS = countByFilter(SAMPLE_APPLICATIONS, '');

/** Chip counts: the board's totals (62 applied, of which only ten rows are sample data), moved by any status edits. */
function displayCounts(current: FilterCounts, query: string, live: FilterCounts): FilterCounts {
  if (query.trim() !== '') return live;
  const out = { ...SAMPLE_TOTALS.byFilter } as FilterCounts;
  for (const k of Object.keys(out) as (keyof FilterCounts)[]) out[k] += current[k] - BASE_COUNTS[k];
  return out;
}

export function AppliedView({
  state,
  dispatch,
  onTab,
  upNextCount,
  upNextCompany,
  onAddJobs,
  modalOpen,
}: {
  state: DashboardState;
  dispatch: Dispatch<DashboardAction>;
  onTab: (t: DashboardTab) => void;
  upNextCount: number;
  /** Resolves a company in Up next the current search would match (for the empty-state hint). */
  upNextCompany: (tokens: string[]) => string | undefined;
  onAddJobs: () => void;
  /** A dialog owned by the page (Add jobs) is open: global keys stand down. */
  modalOpen: boolean;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => visibleApps(state), [state]);
  const live = useMemo(() => countByFilter(state.apps, state.query), [state.apps, state.query]);
  const unfiltered = useMemo(() => countByFilter(state.apps, ''), [state.apps]);
  const counts = displayCounts(unfiltered, state.query, live);
  const selected = selectedApp(state);
  const filtered = state.query.trim() !== '' || state.filter !== 'all';
  const total = filtered ? rows.length : SAMPLE_TOTALS.applied;

  const onEffect = useCallback(
    (effect: KeyEffect) => {
      if (effect === 'focusSearch') searchRef.current?.focus();
      else if (effect === 'blurSearch') searchRef.current?.blur();
      else if (effect === 'openPosting') {
        if (selected) window.open(selected.postingUrl, '_blank', 'noopener,noreferrer');
      } else if (effect === 'confirmStatus' && state.statusMenu) {
        const status = STATUS_MENU_ORDER[state.statusMenu.cursor];
        if (status) dispatch({ type: 'setStatus', status, today: todayIso() });
      }
    },
    [selected, state.statusMenu, dispatch],
  );
  useDashboardKeys(state, dispatch, onEffect, !modalOpen);

  const hintMode: HintMode =
    rows.length === 0 ? 'search-empty' : state.statusMenu ? 'status' : state.peekOpen ? 'peek' : 'list';
  const position = selected ? rows.findIndex((r) => r.id === selected.id) + 1 : 0;

  const pickStatus = (status: ApplicationStatus) => dispatch({ type: 'setStatus', status, today: todayIso() });

  return (
    <div className="relative flex h-[calc(100vh-var(--app-toolbar-height))]">
      <main className="box-border flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto px-14 pt-5 pb-[34px]">
        <div className="flex flex-nowrap items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-nowrap items-center gap-[18px]">
              <h1 className="m-0 font-serif text-[42px] leading-[1.02] font-[350] tracking-[-0.025em]">Dashboard</h1>
              <TabSwitch
                active="applied"
                appliedCount={SAMPLE_TOTALS.applied}
                upNextCount={upNextCount}
                onChange={onTab}
                className="flex-none"
              />
            </div>
          </div>
          <Button variant="primary" size="sm" className="flex-none" onClick={onAddJobs}>
            Add jobs
            <span className="ml-2 font-mono text-xs opacity-60">⌘V</span>
          </Button>
        </div>
        <MetricRow />
        <div className="flex min-w-0 flex-nowrap items-center justify-between gap-3 [@media(width<=1194px)]:flex-wrap [@media(width<=1194px)]:items-stretch [@media(width<=1194px)]:[&>[role=group]]:w-full">
          <SearchField ref={searchRef} value={state.query} onChange={(query) => dispatch({ type: 'query', query })} />
          <FilterChips
            counts={counts}
            active={state.filter}
            onChange={(filter) => dispatch({ type: 'filter', filter })}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyResults
            query={state.query.trim()}
            appliedTotal={SAMPLE_TOTALS.applied}
            upNextCompany={upNextCompany(state.query.toLowerCase().split(/\s+/).filter(Boolean))}
            onClear={() => {
              dispatch({ type: 'query', query: '' });
              dispatch({ type: 'filter', filter: 'all' });
            }}
            onOpenUpNext={() => onTab('up-next')}
          />
        ) : (
          <>
            <ApplicationsTable
              rows={rows}
              query={state.query}
              selectedId={state.selectedId}
              statusMenu={state.statusMenu}
              onSelect={(id) => dispatch({ type: 'select', id, peek: true })}
              onOpenStatus={(id) => dispatch({ type: 'openStatus', id })}
              onPickStatus={pickStatus}
              onCloseStatus={() => dispatch({ type: 'closeStatus' })}
            />
            <Pagination
              from={1}
              to={rows.length}
              total={total}
              perPage={SAMPLE_TOTALS.perPage}
              totalPages={filtered ? 1 : SAMPLE_TOTALS.pages}
            />
          </>
        )}
        <KeyHints mode={hintMode} />
      </main>
      {state.peekOpen && selected && (
        <PeekPanel
          app={selected}
          position={position}
          total={total}
          canUndo={canUndo(state)}
          onClose={() => dispatch({ type: 'closePeek' })}
          onUndo={() => dispatch({ type: 'undoStatus' })}
          onOpenCv={() => dispatch({ type: 'openCv' })}
          onOpenPosting={() => onEffect('openPosting')}
        />
      )}
      {state.cvOpen && selected && (
        <CvViewerDialog
          company={selected.company}
          cv={sentCvFor(selected)}
          onClose={() => dispatch({ type: 'closeCv' })}
        />
      )}
    </div>
  );
}
