import { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddJobsDialog } from '../features/dashboard/addjobs/AddJobsDialog';
import { appliedItem, isApplied, queueItem } from '../features/dashboard/applications';
import { AppliedView } from '../features/dashboard/AppliedView';
import type { DashboardTab } from '../features/dashboard/components/TabSwitch';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const reload = useCallback(
    () =>
      window.jobpilot!.applications.list().then((items) => {
        dispatchApplied({ type: 'loaded', apps: items.filter(isApplied).map(appliedItem) });
        dispatchQueue({ type: 'loaded', items: items.filter((item) => !isApplied(item)).map(queueItem) });
        setLoadError(null);
      }),
    [],
  );
  useEffect(() => {
    void reload().catch(() => setLoadError('Could not load applications. Please reload.'));
  }, [reload]);
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

  const onAdded = async () => {
    await reload();
    navigate('/?tab=up-next');
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
          state={queue}
          dispatch={dispatchQueue}
          onTab={goTab}
          onOpenInbox={() => navigate('/inbox')}
          onAddJobs={openAddJobs}
          modalOpen={addJobsOpen}
        />
      )}
      {addJobs && <AddJobsDialog initialText={addJobs.text} onAdded={onAdded} onClose={() => setAddJobs(null)} />}
    </>
  );
}
