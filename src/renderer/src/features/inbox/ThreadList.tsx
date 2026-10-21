import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { CritterBot } from '../../components/CritterBot';
import { KeyCap } from '../../components/KeyCap';
import { MonoLabel } from '../../components/MonoLabel';
import { CAP_LIST_PREVIEW, type InboxItem, type ItemId, type ThreadId } from './model';

const ROW: CSSProperties = {
  gridTemplateColumns: '40px minmax(0,1fr) auto',
  alignItems: 'start',
  margin: '0 8px',
};

const TAG_COLOR = { work: 'var(--work)', bad: 'var(--bad)', need: 'var(--need)' } as const;

const ELLIPSIS: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

function Row({
  on,
  onSelect,
  lead,
  time,
  children,
}: {
  on: boolean;
  onSelect: () => void;
  lead: ReactNode;
  time: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={on ? 'rrow jp-rrow-btn on' : 'rrow jp-rrow-btn'}
      style={ROW}
      onClick={onSelect}
      aria-current={on ? 'true' : undefined}
    >
      {lead}
      {children}
      <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'start', marginTop: 4 }}>{time}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '14px 20px 6px' }}>
      <MonoLabel>{children}</MonoLabel>
    </div>
  );
}

function CapRow({ on, clear, onSelect }: { on: boolean; clear: boolean; onSelect: () => void }) {
  return (
    <Row
      on={on}
      onSelect={onSelect}
      time={clear ? CAP_LIST_PREVIEW.clearTime : CAP_LIST_PREVIEW.pendingTime}
      lead={
        <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center' }}>
          <CapOnDartArt size={38} />
        </span>
      }
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div className="row nw" style={{ gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14.5 }}>Cap</span>
          <MonoLabel>pinned</MonoLabel>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', ...ELLIPSIS }}>
          {clear ? CAP_LIST_PREVIEW.clear : CAP_LIST_PREVIEW.pending}
        </div>
      </div>
    </Row>
  );
}

function ItemRow({
  item,
  on,
  driving,
  onSelect,
}: {
  item: InboxItem;
  on: boolean;
  driving: boolean;
  onSelect: () => void;
}) {
  return (
    <Row
      on={on}
      onSelect={onSelect}
      time={item.age}
      lead={<CritterBot agent={item.agent} state={item.critter} size={40} />}
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="row nw" style={{ gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14.5, minWidth: 0, ...ELLIPSIS }}>{item.agent}</span>
          <MonoLabel
            style={{
              color: TAG_COLOR[item.tone],
              border: `1px solid ${TAG_COLOR[item.tone]}`,
              borderRadius: 6,
              padding: '1px 6px',
              flex: 'none',
            }}
          >
            {item.tag}
          </MonoLabel>
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            color: 'var(--ink-2)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {driving ? 'You have control · its agent is paused' : item.preview}
        </div>
        <div className="s" style={{ fontSize: 12 }}>
          {item.role}
        </div>
      </div>
    </Row>
  );
}

export interface ThreadListProps {
  items: readonly InboxItem[];
  /** Pending count before the search filter (drives the headings). */
  pendingCount: number;
  selected: ThreadId | null;
  /** Item the owner is driving, if any (its row says so). */
  takeover: ItemId | null;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (id: ThreadId) => void;
}

/** Left column: title, search, pinned Cap thread, and the items that need the owner. */
export const ThreadList = forwardRef<HTMLInputElement, ThreadListProps>(function ThreadList(
  { items, pendingCount, selected, takeover, query, onQuery, onSelect },
  searchRef,
) {
  const clear = pendingCount === 0;
  return (
    <aside
      style={{
        background: 'var(--bg)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 'none', padding: '22px 20px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row sp nw">
          <h1 className="h1" style={{ fontSize: 36 }}>
            Inbox
          </h1>
          <span className="s" style={{ fontSize: 12.5 }}>
            {clear ? 'All clear' : `${pendingCount} need you`}
          </span>
        </div>
        <label className="inp ph" style={{ height: 38, borderRadius: 99, fontSize: 13.5, gap: 8 }}>
          <input
            ref={searchRef}
            className="jp-inbox-search"
            type="text"
            value={query}
            placeholder="Search"
            aria-label="Search the inbox"
            onChange={(e) => onQuery(e.target.value)}
          />
          <span style={{ marginLeft: 'auto' }}>
            <KeyCap>/</KeyCap>
          </span>
        </label>
      </div>
      <div
        className="inbox-thread-list"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <SectionLabel>Pilot</SectionLabel>
        <CapRow on={selected === 'cap'} clear={clear} onSelect={() => onSelect('cap')} />
        <SectionLabel>{clear ? 'Needs you · 0' : `Needs you · ${pendingCount} · newest first`}</SectionLabel>
        {clear ? (
          <div className="s" style={{ padding: '4px 20px 8px', fontSize: 13, lineHeight: 1.5 }}>
            Nothing is waiting on you. The crew handles the rest.
          </div>
        ) : items.length === 0 ? (
          <div className="s" style={{ padding: '4px 20px 8px', fontSize: 13, lineHeight: 1.5 }}>
            No match for “{query}”.
          </div>
        ) : (
          items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              on={selected === item.id}
              driving={takeover === item.id}
              onSelect={() => onSelect(item.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
});
