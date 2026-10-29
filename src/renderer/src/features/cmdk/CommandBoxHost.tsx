import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplications, useSetApplicationStatus } from '../../lib/api';
import { toJobRecords, toOwnerStatus } from './applications';
import { CommandBox } from './CommandBox';
import type { CommandIntent } from './search';

export const ASK_CAP_EVENT = 'jobpilot:ask-cap';

/** Opens the command box from anywhere (the top bar's "Ask Cap" button) without sharing React state. */
export const openCommandBox = (): void => {
  window.dispatchEvent(new Event(ASK_CAP_EVENT));
};

/**
 * Global ⌘K overlay. Mount once, inside the router, in the shell:
 *
 *   <TopBar onAsk={openCommandBox} />
 *   <Outlet />
 *   <CommandBoxHost />
 *
 * It owns the ⌘K / Ctrl+K shortcut and the open state, restores focus on close, and renders nothing
 * while closed. Jobs come from the applications query; a chosen status change goes through the real mutation.
 */
export function CommandBoxHost() {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { data: items } = useApplications();
  const jobs = useMemo(() => toJobRecords(items ?? []), [items]);
  const setStatus = useSetApplicationStatus();
  const [failed, setFailed] = useState(false);

  const onRun = useCallback(
    (intent: CommandIntent) => {
      if (intent.type === 'open-job') void navigate('/');
      else if (intent.type === 'set-status')
        setStatus.mutate(
          { id: intent.jobId, status: toOwnerStatus(intent.status) },
          { onError: () => setFailed(true) },
        );
    },
    [navigate, setStatus],
  );

  useEffect(() => {
    if (!failed) return;
    const timer = window.setTimeout(() => setFailed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [failed]);

  const show = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.();
    returnFocus.current = null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) close();
        else show();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(ASK_CAP_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(ASK_CAP_EVENT, show);
    };
  }, [open, show, close]);

  return (
    <>
      {open && <CommandBox jobs={jobs} onRun={onRun} onOpenInInbox={() => void navigate('/inbox')} onClose={close} />}
      {failed && (
        <div
          role="alert"
          className="fixed bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-line bg-bg px-5 py-3 text-sm text-ink shadow-float"
        >
          Could not change that status.
        </div>
      )}
    </>
  );
}
