import { useEffect, useReducer, useRef } from 'react';
import { Button, Switch, cx } from '../../../components/ui';
import { V17CapDart } from '../../../components/V17CapDart';
import { V17Icon } from '../../../components/V17Icon';
import '../../../components/v17-status.css';
import { shortDate } from '../format';
import { initialPopupState, isSelectable, popupReducer, type PageLink, type PageScan, type PopupState } from './model';

function LinkRow({
  link,
  matchRoles,
  ticked,
  onToggle,
}: {
  link: PageLink;
  matchRoles: boolean;
  ticked: boolean;
  onToggle: () => void;
}) {
  const selectable = isSelectable(link, matchRoles);
  const applied = link.state.kind === 'applied';
  const dim = applied ? 0.72 : link.state.kind === 'filtered' && matchRoles ? 0.5 : 1;
  return (
    <div
      className={cx(
        'flex cursor-pointer flex-nowrap items-center gap-2.5 border-t border-line py-1.5 text-[13px] aria-disabled:cursor-default',
        applied ? 'opacity-[0.72]' : link.state.kind === 'filtered' && matchRoles ? 'opacity-50' : 'opacity-100',
      )}
      role="checkbox"
      aria-checked={ticked}
      aria-disabled={!selectable}
      tabIndex={selectable ? 0 : -1}
      onClick={selectable ? onToggle : undefined}
      onKeyDown={(e) => {
        if (selectable && e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <span
        className={cx(
          'grid size-[18px] flex-none place-items-center rounded-[5px] border-[1.5px] text-on-pri',
          applied
            ? 'border-line-2 bg-hover'
            : ticked
              ? 'border-pri bg-pri'
              : 'border-line-2 bg-transparent',
        )}
      >
        {ticked && <V17Icon name="check" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{link.title}</div>
        <div className="text-xs text-muted">
          {link.place} · {link.team}
        </div>
      </div>
      {link.state.kind === 'applied' && (
        <span className="inline-block rounded-full bg-line px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap text-ink-2">
          Applied · {shortDate(link.state.on)}
        </span>
      )}
      {link.state.kind === 'filtered' && matchRoles && (
        <span className="font-mono text-[11.5px] tracking-[0.06em] whitespace-nowrap text-muted">
          {link.state.reason}
        </span>
      )}
    </div>
  );
}

/** The "sent" card: what went to Up next, with the way into it. Also drawn standalone on the board. */
export function SentCard({
  titles,
  onSeeUpNext,
  onDismiss,
}: {
  titles: string[];
  onSeeUpNext?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5 rounded-3xl border border-line bg-bg p-6">
      <div className="flex flex-nowrap items-center gap-3.5">
        <V17CapDart size={46} mood="happy" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-[650]">✓ {titles.length} sent · now in Up next</div>
          <div className="text-[13px] leading-normal text-muted">{titles.join(' · ')}</div>
        </div>
      </div>
      <div className="flex flex-nowrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={onSeeUpNext}>
          See Up next
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/**
 * The extension popup: every job link found on the page, tick what fits, send. Only ticked links are sent
 * and applied jobs are locked. Enter sends, Esc closes. `onSend` receives the ticked links (the caller owns
 * delivery; here nothing leaves the app).
 */
export function ExtensionPopup({
  scan,
  onClose,
  onSend,
  onSeeUpNext,
}: {
  scan: PageScan;
  onClose: () => void;
  onSend: (links: PageLink[]) => void;
  onSeeUpNext: () => void;
}) {
  const [state, dispatch] = useReducer(popupReducer(scan), scan, initialPopupState);
  const ref = useRef<HTMLDivElement>(null);
  const count = state.ticked.length;

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const send = (s: PopupState) => {
    const links = scan.links.filter((l) => s.ticked.includes(l.id));
    if (!links.length) return;
    dispatch({ type: 'send' });
    onSend(links);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="JobPilot"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !state.sent) {
          e.preventDefault();
          send(state);
        }
      }}
      className="absolute top-2.5 right-6 z-[4] box-border flex w-[384px] flex-col gap-2 rounded-[22px] border border-line-2 bg-bg px-[18px] pt-3.5 pb-4 shadow-float outline-none focus-visible:outline-none!"
    >
      {state.sent ? (
        <SentCard
          titles={state.sent.map((l) => l.title)}
          onSeeUpNext={onSeeUpNext}
          onDismiss={() => {
            dispatch({ type: 'reset' });
            onClose();
          }}
        />
      ) : (
        <>
          <div className="flex flex-nowrap items-center gap-3">
            <V17CapDart size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-[650]">{scan.total} job links on this page</div>
              <div className="font-mono text-xs text-muted">
                {scan.host} · showing {scan.links.length}
              </div>
            </div>
            <button
              type="button"
              title="Close"
              aria-label="Close"
              onClick={onClose}
              className="inline-grid size-[30px] flex-none cursor-pointer place-items-center rounded-[9px] border border-line bg-bg p-0 text-ink-2"
            >
              <V17Icon name="close" />
            </button>
          </div>
          <div className="flex flex-nowrap items-center justify-between gap-3 border-y border-line py-2">
            <button
              type="button"
              role="switch"
              aria-checked={state.matchRoles}
              onClick={() => dispatch({ type: 'match', on: !state.matchRoles })}
              className="flex cursor-pointer flex-nowrap items-center gap-2.5 border-0 bg-transparent p-0 text-[13px] font-semibold"
            >
              <Switch on={state.matchRoles} />
              Match my roles
            </button>
            <span className="flex flex-nowrap items-center gap-3.5">
              <button
                type="button"
                className="inline-flex cursor-pointer border-0 bg-transparent p-0"
                onClick={() => dispatch({ type: 'all' })}
              >
                <span className="font-mono text-[11.5px] tracking-[0.06em] text-ink-2">ALL</span>
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer border-0 bg-transparent p-0"
                onClick={() => dispatch({ type: 'none' })}
              >
                <span className="font-mono text-[11.5px] tracking-[0.06em] text-muted">NONE</span>
              </button>
            </span>
          </div>
          {scan.links.map((l) => (
            <LinkRow
              key={l.id}
              link={l}
              matchRoles={state.matchRoles}
              ticked={state.ticked.includes(l.id)}
              onToggle={() => dispatch({ type: 'toggle', id: l.id })}
            />
          ))}
          <Button className="mt-1 w-full" variant="primary" disabled={count === 0} onClick={() => send(state)}>
            Send {count} to JobPilot · ↵
          </Button>
          <div className="text-center text-xs text-muted">Only ticked links are sent. Applied jobs are locked.</div>
        </>
      )}
    </div>
  );
}
