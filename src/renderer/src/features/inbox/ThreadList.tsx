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
      <span className="text-[12px] text-muted self-start mt-[4px]">{time}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="p-[14px_20px_6px]">
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
        <span className="w-[40px] h-[40px] grid place-items-center">
          <CapOnDartArt size={38} />
        </span>
      }
    >
      <div className="min-w-[0px] flex flex-col gap-[3px]">
        <div className="flex items-center gap-[8px] flex-nowrap" >
          <span className="font-[600] text-[14.5px]">Cap</span>
          <MonoLabel>pinned</MonoLabel>
        </div>
        <div className="text-[13px] text-muted whitespace-nowrap overflow-hidden text-ellipsis">
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
      <div className="min-w-[0px] flex flex-col gap-[4px]">
        <div className="flex items-center gap-[8px] flex-nowrap min-w-[0px]" >
          <span className="font-[600] text-[14.5px] min-w-[0px] whitespace-nowrap overflow-hidden text-ellipsis">{item.agent}</span>
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
          className="text-[13px] leading-[1.35] text-ink-2 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden"
        >
          {driving ? 'You have control · its agent is paused' : item.preview}
        </div>
        <div className="text-[12px] text-muted" >
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
      className="bg-bg [border-right:1px_solid_var(--line)] flex flex-col min-h-[0px] min-w-[0px] overflow-hidden"
    >
      <div className="flex-none p-[22px_20px_12px] flex flex-col gap-[14px]">
        <div className="flex items-center gap-[12px] flex-nowrap justify-between">
          <h1 className="font-serif font-[350] text-[36px] tracking-[-.025em] leading-[1.02] m-[0px]" >
            Inbox
          </h1>
          <span className="text-[12.5px] text-muted" >
            {clear ? 'All clear' : `${pendingCount} need you`}
          </span>
        </div>
        <label className="flex items-center gap-[8px] h-[38px] p-[0_14px] [border:1px_solid_var(--line-2)] rounded-[99px] bg-bg text-[13.5px] text-muted min-w-[0px] focus-within:border-ink focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_14%,transparent)]" >
          <input
            ref={searchRef}
            className="flex-1 min-w-[0px] h-[100%] [border:0] [outline:0] bg-transparent text-ink [font:inherit] p-[0px] appearance-none placeholder:text-muted placeholder:opacity-100 focus-visible:outline-none!"
            type="text"
            value={query}
            placeholder="Search"
            aria-label="Search the inbox"
            onChange={(e) => onQuery(e.target.value)}
          />
          <span className="ml-[auto]">
            <KeyCap>/</KeyCap>
          </span>
        </label>
      </div>
      <div
        className="flex-1 min-h-[0px] overflow-y-auto flex flex-col gap-[2px] [&>*]:shrink-0"
        
      >
        <SectionLabel>Pilot</SectionLabel>
        <CapRow on={selected === 'cap'} clear={clear} onSelect={() => onSelect('cap')} />
        <SectionLabel>{clear ? 'Needs you · 0' : `Needs you · ${pendingCount} · newest first`}</SectionLabel>
        {clear ? (
          <div className="text-[13px] text-muted p-[4px_20px_8px] leading-[1.5]" >
            Nothing is waiting on you. The crew handles the rest.
          </div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-muted p-[4px_20px_8px] leading-[1.5]" >
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
