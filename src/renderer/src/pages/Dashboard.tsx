import { useEffect, useReducer, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddJobsDialog } from '../features/dashboard/addjobs/AddJobsDialog';
import { appliedItem, isApplied, queueItem } from '../features/dashboard/applications';
import { AppliedView } from '../features/dashboard/AppliedView';
import type { DashboardTab } from '../features/dashboard/components/TabSwitch';
import { useApplications } from '../lib/api';
import { dashboardReducer, initialState } from '../features/dashboard/state';
import { UpNextView } from '../features/dashboard/UpNextView';
import { initialQueueState, queueReducer } from '../features/dashboard/upnext/queue';

interface AddJobsState {
  text: string;
}

const isTextTarget = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/**
 * Dashboard (route `/`): Applied by default, Up next with `?tab=up-next`. Both tabs are one route so the
 * top bar keeps Dashboard active and state survives switching tabs. Owns the Add jobs sheet: ⌘V anywhere
 * on the page (outside a text field) or the Add jobs button opens it.
 */
export function Dashboard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tab: DashboardTab = params.get('tab') === 'up-next' ? 'up-next' : 'applied';

  const [applied, dispatchApplied] = useReducer(dashboardReducer, [], initialState);
  const [queue, dispatchQueue] = useReducer(queueReducer, initialQueueState([]));
  const [addJobs, setAddJobs] = useState<AddJobsState | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const { data: items, isError } = useApplications();
  const loadError = isError ? 'Could not load applications. Please reload.' : null;
  // Main pushes data-changed events, so `items` updates live; mirror each new list into the screen reducers.
  useEffect(() => {
    if (!items) return;
    dispatchApplied({ type: 'loaded', apps: items.filter(isApplied).map(appliedItem) });
    dispatchQueue({ type: 'loaded', items: items.filter((item) => !isApplied(item)).map(queueItem) });
  }, [items]);
  const addJobsOpen = addJobs !== null;

  useEffect(() => {
    if (addJobsOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      if (isTextTarget(e.target)) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (!text.trim()) return;
      e.preventDefault();
      setAddJobs({ text });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addJobsOpen]);

  useEffect(() => {
    if (!addedIds.length) return;
    const timer = window.setTimeout(() => setAddedIds([]), 5000);
    return () => window.clearTimeout(timer);
  }, [addedIds]);

  const onAdded = async (ids: string[], complete: boolean) => {
    navigate('/?tab=up-next');
    setAddedIds(ids);
    if (complete) setAddJobs(null);
  };

  const goTab = (t: DashboardTab) => navigate(t === 'applied' ? '/' : '/?tab=up-next');
  const openAddJobs = () => setAddJobs({ text: '' });

  return (
    <>
      {loadError && <p role="alert">{loadError}</p>}
      {tab === 'applied' ? (
        <AppliedView
          state={applied}
          dispatch={dispatchApplied}
          onTab={goTab}
          upNextCount={queue.items.length}
          upNextCompany={(tokens) =>
            queue.items.find((i) => tokens.some((tok) => i.company.toLowerCase().includes(tok)))?.company
          }
          onAddJobs={openAddJobs}
          modalOpen={addJobsOpen}
        />
      ) : (
        <UpNextView
          appliedCount={applied.apps.length}
          state={queue}
          dispatch={dispatchQueue}
          onTab={goTab}
          onOpenInbox={() => navigate('/inbox')}
          onAddJobs={openAddJobs}
          modalOpen={addJobsOpen}
          addedIds={addedIds}
        />
      )}
      {!!addedIds.length && (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-line bg-bg px-5 py-3 text-sm text-ink shadow-float"
        >
          Added {addedIds.length} {addedIds.length === 1 ? 'job' : 'jobs'}
        </div>
      )}
      {addJobs && <AddJobsDialog initialText={addJobs.text} onAdded={onAdded} onClose={() => setAddJobs(null)} />}
    </>
  );
}
