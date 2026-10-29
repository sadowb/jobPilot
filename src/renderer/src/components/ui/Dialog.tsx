import { useEffect, useId, useRef, type FormEventHandler, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { controlFocus } from './controlStyles';
import { cn } from './cx';

let scrollLocks = 0;
let bodyWasLocked = false;
function lockBody() {
  if (scrollLocks++ === 0) {
    bodyWasLocked = document.body.classList.contains('overflow-hidden!');
    document.body.classList.add('overflow-hidden!');
  }
  return () => {
    if (--scrollLocks === 0 && !bodyWasLocked) document.body.classList.remove('overflow-hidden!');
  };
}

/**
 * Opens a native <dialog> modally while `open`: the platform makes the rest of the page inert, traps Tab and
 * labels it aria-modal. Locks body scroll and puts focus back on the opener when it closes.
 */
export function useModalDialog(ref: RefObject<HTMLDialogElement | null>, open = true): void {
  useEffect(() => {
    const element = ref.current;
    if (!open || !element) return;
    const opener = document.activeElement;
    element.showModal();
    const unlock = lockBody();
    return () => {
      if (element.open) element.close();
      unlock();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [ref, open]);
}

export interface DialogProps {
  open: boolean;
  /** Close request: set open=false. Keep mounted while toggling open. */
  onClose: () => void;
  title: ReactNode;
  titleAdornment?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  note?: ReactNode;
  /** Footer buttons; defaults to Done. Submit buttons invoke onSubmit. */
  actions?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  closeLabel?: string;
  className?: string;
  bodyClassName?: string;
}

/** Profile editor geometry and motion, portalled out of scrolling feature containers. */
export function Dialog({
  open,
  onClose,
  title,
  titleAdornment,
  eyebrow = 'Profile & documents',
  description,
  children,
  note,
  actions,
  onSubmit,
  closeLabel = 'Close editor',
  className,
  bodyClassName,
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const backdropPress = useRef(false);

  useModalDialog(dialog, open);

  // SSR emits no modal; useId is still called in the same order during hydration.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'm-auto w-[min(640px,calc(100vw-32px))] max-h-[min(760px,calc(100dvh-48px))]',
        'overflow-hidden rounded-3xl border border-line bg-bg p-0 font-sans text-ink shadow-float',
        'backdrop:bg-black/25 backdrop:backdrop-blur-[8px] dark:backdrop:bg-black/45',
        'open:animate-jp-dialog-rise open:backdrop:animate-jp-dialog-fade',
        'motion-reduce:animate-none! motion-reduce:backdrop:animate-none!',
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        // Ignore the queued native close event from effect cleanup or StrictMode replay.
        if (open && !event.currentTarget.open) onClose();
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            onClose();
          }
        }
        backdropPress.current = false;
      }}
    >
      <form
        className="flex max-h-[min(760px,calc(100dvh-48px))] flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (onSubmit) onSubmit(event);
          else onClose();
        }}
      >
        <header className="flex items-start justify-between gap-[18px] border-b border-line px-7 pt-6 pb-5 [@media(width<=800px)]:p-5">
          <div>
            {eyebrow && <div className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{eyebrow}</div>}
            <h2
              id={titleId}
              className="my-2 flex items-center gap-2.5 font-serif text-[30px] leading-[1.15] font-normal tracking-[-0.02em]"
            >
              {titleAdornment}
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="m-0 text-[13px] leading-[1.5] text-muted">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={closeLabel}
            onClick={onClose}
            className={cn('h-auto! min-h-[34px] font-sans! text-ink-2! transition-none', controlFocus)}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Button>
        </header>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-7 py-6 [@media(width<=800px)]:p-5', bodyClassName)}>
          {children}
        </div>
        <footer className="flex items-center justify-between gap-4 border-t border-line px-7 py-5 text-xs leading-[1.45] text-muted">
          <span aria-live="polite">{note}</span>
          <div className="flex flex-none flex-wrap items-center gap-2">
            {actions ?? (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className={cn(
                  'font-sans! text-[13.5px]! leading-[1.45]! font-semibold! text-on-pri! transition-none',
                  controlFocus,
                )}
              >
                Done
              </Button>
            )}
          </div>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
