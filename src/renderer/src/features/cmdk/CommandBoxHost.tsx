import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandBox, type CommandBoxProps } from './CommandBox';

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
 * while closed. Pass `onRun` to receive the chosen CommandIntent (nothing is applied until it does).
 */
export function CommandBoxHost({ onRun, jobs }: Pick<CommandBoxProps, 'onRun' | 'jobs'>) {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

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

  if (!open) return null;
  return <CommandBox jobs={jobs} onRun={onRun} onOpenInInbox={() => void navigate('/inbox')} onClose={close} />;
}
