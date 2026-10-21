import { useEffect, useReducer, useRef, type CSSProperties } from 'react';
import { V17CapDart } from '../../../components/V17CapDart';
import { V17Icon } from '../../../components/V17Icon';
import '../../../components/v17-status.css';
import { shortDate } from '../format';
import './extension.css';
import { initialPopupState, isSelectable, popupReducer, type PageLink, type PageScan, type PopupState } from './model';

const title: CSSProperties = { fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const rowBase: CSSProperties = { gap: 10, padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: 13 };
const boxOn: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 5,
  border: '1.5px solid var(--pri)',
  background: 'var(--pri)',
  color: 'var(--on-pri)',
  display: 'grid',
  placeItems: 'center',
  flex: 'none',
};
const boxOff: CSSProperties = { ...boxOn, border: '1.5px solid var(--line-2)', background: 'transparent' };
const boxLocked: CSSProperties = { ...boxOff, background: 'var(--hover)' };

const bareBtn: CSSProperties = { border: 0, background: 'transparent', padding: 0, display: 'inline-flex' };

const pillMuted: CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ink-2)',
  background: 'var(--line)',
  borderRadius: 99,
  padding: '3px 10px',
  whiteSpace: 'nowrap',
};

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
      className="row nw ext-row"
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
      style={{ ...rowBase, opacity: dim }}
    >
      <span style={applied ? boxLocked : ticked ? boxOn : boxOff}>{ticked && <V17Icon name="check" />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={title}>{link.title}</div>
        <div className="s" style={{ fontSize: 12 }}>
          {link.place} · {link.team}
        </div>
      </div>
      {link.state.kind === 'applied' && <span style={pillMuted}>Applied · {shortDate(link.state.on)}</span>}
      {link.state.kind === 'filtered' && matchRoles && (
        <span className="spec" style={{ whiteSpace: 'nowrap', letterSpacing: '.06em' }}>
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
    <div className="mcell" style={{ gap: 14, background: 'var(--bg)' }}>
      <div className="row nw" style={{ gap: 14, alignItems: 'center' }}>
        <V17CapDart size={46} mood="happy" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 650 }}>✓ {titles.length} sent · now in Up next</div>
          <div className="s" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {titles.join(' · ')}
          </div>
        </div>
      </div>
      <div className="row nw" style={{ gap: 8 }}>
        <button className="btn sm pri" type="button" onClick={onSeeUpNext}>
          See Up next
        </button>
        <button className="btn sm ghost" type="button" onClick={onDismiss}>
          Dismiss
        </button>
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
      style={{
        position: 'absolute',
        top: 10,
        right: 24,
        width: 384,
        boxSizing: 'border-box',
        background: 'var(--bg)',
        border: '1px solid var(--line-2)',
        borderRadius: 22,
        boxShadow: 'var(--float)',
        padding: '14px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 4,
        outline: 'none',
      }}
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
          <div className="row nw" style={{ gap: 12, alignItems: 'center' }}>
            <V17CapDart size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 15 }}>{scan.total} job links on this page</div>
              <div className="s" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
                {scan.host} · showing {scan.links.length}
              </div>
            </div>
            <button
              type="button"
              title="Close"
              aria-label="Close"
              onClick={onClose}
              className="ext-btn"
              style={{
                display: 'inline-grid',
                placeItems: 'center',
                width: 30,
                height: 30,
                borderRadius: 9,
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                flex: 'none',
                padding: 0,
              }}
            >
              <V17Icon name="close" />
            </button>
          </div>
          <div
            className="row sp nw"
            style={{ padding: '8px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={state.matchRoles}
              onClick={() => dispatch({ type: 'match', on: !state.matchRoles })}
              className="row nw ext-btn"
              style={{
                font: 'inherit',
                gap: 10,
                fontSize: 13,
                fontWeight: 600,
                border: 0,
                background: 'transparent',
                padding: 0,
                color: 'inherit',
              }}
            >
              <span className={state.matchRoles ? 'switch on' : 'switch'}>
                <i />
              </span>
              Match my roles
            </button>
            <span className="row nw" style={{ gap: 14 }}>
              <button type="button" className="ext-btn" onClick={() => dispatch({ type: 'all' })} style={bareBtn}>
                <span className="spec" style={{ color: 'var(--ink-2)', letterSpacing: '.06em' }}>
                  ALL
                </span>
              </button>
              <button type="button" className="ext-btn" onClick={() => dispatch({ type: 'none' })} style={bareBtn}>
                <span className="spec" style={{ letterSpacing: '.06em' }}>
                  NONE
                </span>
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
          <button
            className="btn pri"
            type="button"
            disabled={count === 0}
            onClick={() => send(state)}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: count === 0 ? 0.5 : undefined }}
          >
            Send {count} to JobPilot · ↵
          </button>
          <div className="s" style={{ fontSize: 12, textAlign: 'center' }}>
            Only ticked links are sent. Applied jobs are locked.
          </div>
        </>
      )}
    </div>
  );
}
