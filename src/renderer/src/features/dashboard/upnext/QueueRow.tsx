import type { CSSProperties } from 'react';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17Icon } from '../../../components/V17Icon';
import '../../../components/v17-status.css';
import { isReorderable, type QueueItem } from './queue';

export const QUEUE_GRID = '36px 56px minmax(0,2.6fr) minmax(0,1.15fr) 80px 100px 184px';

const rowBase: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: QUEUE_GRID,
  columnGap: 12,
  alignItems: 'center',
  minHeight: 62,
  padding: '0 14px',
  borderTop: '1px solid var(--line)',
};
const box: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 5,
  border: '1.5px solid var(--line-2)',
  background: 'transparent',
  color: 'var(--on-pri)',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  cursor: 'pointer',
};
const boxOn: CSSProperties = { ...box, border: '1.5px solid var(--pri)', background: 'var(--pri)' };
const sourcePill: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  letterSpacing: '.06em',
  color: 'var(--ink-2)',
  border: '1px solid var(--line)',
  borderRadius: 7,
  padding: '2px 7px',
  whiteSpace: 'nowrap',
};
const iconBtn: CSSProperties = {
  display: 'inline-grid',
  placeItems: 'center',
  width: 30,
  height: 30,
  borderRadius: 9,
  color: 'var(--ink-2)',
  border: '1px solid var(--line)',
  background: 'var(--bg)',
  flex: 'none',
};
const grip: CSSProperties = { color: 'var(--muted)', display: 'grid', placeItems: 'center', width: 20 };
const waitPill: CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--st-amber-fg)',
  background: 'var(--st-amber-bg)',
  borderRadius: 99,
  padding: '3px 10px',
  whiteSpace: 'nowrap',
};

export interface QueueRowProps {
  item: QueueItem;
  /** 1-based place among queued jobs, when the job is queued. */
  position: number | null;
  selected: boolean;
  cursor: boolean;
  onCursor: () => void;
  onToggle: () => void;
  onMoveToTop: () => void;
  onHold: () => void;
  onRemove: () => void;
  onOpenInbox: () => void;
  onDragStart: () => void;
  onDropOn: () => void;
}

const stageTag = (item: QueueItem): { label: string; color: string } | null => {
  if (item.stage === 'running') return { label: 'NOW', color: 'var(--work)' };
  if (item.stage === 'waiting') return { label: 'WAIT', color: 'var(--need)' };
  if (item.stage === 'held') return { label: 'HOLD', color: 'var(--need)' };
  return null;
};

/** One Up next row. Running rows are locked; waiting rows hand off to Inbox; queued/held rows can be reordered. */
export function QueueRow(p: QueueRowProps) {
  const { item } = p;
  const running = item.stage === 'running';
  const draggable = isReorderable(item);
  const tag = stageTag(item);
  const showActions = (p.cursor || p.selected) && draggable;
  const style: CSSProperties = running
    ? { ...rowBase, background: 'var(--panel)' }
    : p.selected
      ? { ...rowBase, background: 'var(--brand-tint)', boxShadow: 'inset 3px 0 0 var(--brand)' }
      : p.cursor
        ? { ...rowBase, background: 'var(--hover)' }
        : rowBase;

  return (
    <div
      role="row"
      aria-selected={p.selected}
      style={style}
      draggable={draggable}
      onMouseEnter={p.onCursor}
      onDragStart={draggable ? p.onDragStart : undefined}
      onDragOver={draggable ? (e) => e.preventDefault() : undefined}
      onDrop={draggable ? p.onDropOn : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {running ? (
          <span style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center' }} title="Locked while running">
            <V17Icon name="lock" />
          </span>
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={p.selected}
            aria-label={`Select ${item.company}`}
            style={p.selected ? boxOn : box}
            onClick={p.onToggle}
          >
            {p.selected && <V17Icon name="check" />}
          </button>
        )}
      </div>
      <div>
        {tag ? (
          <span className="spec" style={{ color: tag.color, letterSpacing: '.06em' }}>
            {tag.label}
          </span>
        ) : (
          <span className="s" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {p.position}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="row nw" style={{ gap: 12, minWidth: 0 }}>
          <V17AgentBot name={item.company} state={item.agent} size={30} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{item.company}</div>
            <div
              className="s"
              style={{
                fontSize: 13,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {item.role}
            </div>
            {item.stage === 'held' && item.heldAt && (
              <span
                className="nw"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-2)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 99,
                  padding: '3px 9px 3px 7px',
                  whiteSpace: 'nowrap',
                  flex: 'none',
                }}
              >
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flex: 'none' }} />
                set by you · held {item.heldAt}
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="s" style={{ fontSize: 13.5 }}>
          {item.site}
        </span>
        {item.siteNote && (
          <span className="s" style={{ fontSize: 11.5, color: 'var(--need)' }}>
            {item.siteNote}
          </span>
        )}
      </div>
      <div>
        <span className="s" style={{ fontSize: 13 }}>
          ~{item.estimateMin} min
        </span>
      </div>
      <div>
        <span style={sourcePill}>{item.source}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {running && (
          <span className="row nw" style={{ gap: 6, fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            <V17Icon name="lock" />
            running · can’t remove
          </span>
        )}
        {item.stage === 'waiting' && (
          <span className="row nw" style={{ gap: 10, whiteSpace: 'nowrap' }}>
            <span style={waitPill}>{item.waitReason}</span>
            <button
              type="button"
              className="row nw uq-act"
              onClick={p.onOpenInbox}
              style={{
                gap: 4,
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--brand-text)',
                border: 0,
                background: 'transparent',
              }}
            >
              Inbox
              <V17Icon name="arrowRight" />
            </button>
          </span>
        )}
        {draggable && (
          <div className="row nw" style={{ gap: showActions ? 6 : 0, justifyContent: 'flex-end' }}>
            {showActions && item.stage === 'queued' && (
              <button
                type="button"
                className="uq-act"
                title="Move to top (⇧↑)"
                aria-label="Move to top (⇧↑)"
                style={iconBtn}
                onClick={p.onMoveToTop}
              >
                <V17Icon name="moveTop" />
              </button>
            )}
            {showActions && (
              <button
                type="button"
                className="uq-act"
                title={item.stage === 'held' ? 'Resume (H)' : 'Hold (H)'}
                aria-label={item.stage === 'held' ? 'Resume (H)' : 'Hold (H)'}
                style={iconBtn}
                onClick={p.onHold}
              >
                <V17Icon name={item.stage === 'held' ? 'play' : 'pause'} />
              </button>
            )}
            {showActions && (
              <button
                type="button"
                className="uq-act"
                title="Remove (⌫)"
                aria-label="Remove (⌫)"
                style={iconBtn}
                onClick={p.onRemove}
              >
                <V17Icon name="close" />
              </button>
            )}
            <span title="Drag to reorder" style={grip}>
              <V17Icon name="grip" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
