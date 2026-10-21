import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddJobsDialog } from '../features/dashboard/addjobs/AddJobsDialog';
import { SAMPLE_PASTE, toQueueItems, type ParsedLink } from '../features/dashboard/addjobs/parse';
import { AppliedView } from '../features/dashboard/AppliedView';
import type { DashboardTab } from '../features/dashboard/components/TabSwitch';
import { SAMPLE_APPLICATIONS } from '../features/dashboard/sample';
import { dashboardReducer, initialState } from '../features/dashboard/state';
import { UpNextView } from '../features/dashboard/UpNextView';
import { initialQueueState, queueReducer, scenarioQueue, type QueueScenario } from '../features/dashboard/upnext/queue';

interface AddJobsState {
  text: string;
  from: 'clipboard' | 'typed';
}

const isDevBuild = import.meta.env.DEV || import.meta.env.MODE === 'development';
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

  // `?scenario=bulk|addjobs` seeds the states the boards draw. Dev builds only; production ignores it.
  const [scenarioName] = useState<QueueScenario | null>(() => {
    const name = params.get('scenario');
    return isDevBuild && (name === 'bulk' || name === 'addjobs') ? name : null;
  });
  const scenario = useMemo(() => (scenarioName ? scenarioQueue(scenarioName) : null), [scenarioName]);

  const [applied, dispatchApplied] = useReducer(dashboardReducer, SAMPLE_APPLICATIONS, initialState);
  const [queue, dispatchQueue] = useReducer(queueReducer, scenario?.state ?? initialQueueState());
  const [addJobs, setAddJobs] = useState<AddJobsState | null>(
    scenarioName === 'addjobs' ? { text: SAMPLE_PASTE, from: 'clipboard' } : null,
  );
  const addJobsOpen = addJobs !== null;

  useEffect(() => {
    if (addJobsOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      if (isTextTarget(e.target)) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (!text.trim()) return;
      e.preventDefault();
      setAddJobs({ text, from: 'clipboard' });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addJobsOpen]);

  const queueCtx = useMemo(() => ({ applied: applied.apps, queued: queue.items }), [applied.apps, queue.items]);
  const queueLinks = useCallback(
    (links: ParsedLink[]) => {
      const stamp = Date.now().toString(36);
      const ids = links.map((_, i) => `added-${stamp}-${i}`);
      dispatchQueue({ type: 'add', items: toQueueItems(links, 'Pasted', ids) });
      setAddJobs(null);
      navigate('/?tab=up-next');
    },
    [navigate],
  );

  const goTab = (t: DashboardTab) => navigate(t === 'applied' ? '/' : '/?tab=up-next');
  const openAddJobs = () => setAddJobs({ text: '', from: 'typed' });

  return (
    <>
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
          frozenNow={scenario?.frozenNow}
          onTab={goTab}
          onOpenInbox={() => navigate('/inbox')}
          onAddJobs={openAddJobs}
          modalOpen={addJobsOpen}
        />
      )}
      {addJobs && (
        <AddJobsDialog
          initialText={addJobs.text}
          from={addJobs.from}
          context={queueCtx}
          onQueue={queueLinks}
          onClose={() => setAddJobs(null)}
        />
      )}
    </>
  );
}
