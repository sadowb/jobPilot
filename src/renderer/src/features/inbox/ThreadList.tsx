import { forwardRef, type ReactNode } from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { CritterBot } from '../../components/CritterBot';
import { KeyCap } from '../../components/KeyCap';
import { MonoLabel } from '../../components/MonoLabel';
import { BARE_INPUT, ELLIPSIS, FOCUS_WITHIN, MONO } from './styles';
import { CAP_LIST_PREVIEW, type InboxItem, type ItemId, type ThreadId } from './model';

const TAG_COLOR = {
  work: 'text-work border-work',
  bad: 'text-bad border-bad',
  need: 'text-need border-need',
} as const;

const LABEL = 'px-5 pt-3.5 pb-1.5';
const EMPTY_NOTE = 'px-5 pt-1 pb-2 text-[13px] leading-[1.5] text-muted';

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
      className={`mx-2 grid min-h-[62px] w-[calc(100%_-_16px)] grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-[14px] px-3 py-2.5 text-left ${on ? 'bg-panel' : 'hover:bg-hover'}`}
      onClick={onSelect}
      aria-current={on ? 'true' : undefined}
    >
      {lead}
      {children}
      <span className="mt-1 self-start text-[12px] text-muted">{time}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className={LABEL}>
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
        <span className="grid size-10 place-items-center">
          <CapOnDartArt size={38} />
        </span>
      }
    >
      <div className="flex min-w-0 flex-col gap-[3px]">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-semibold">Cap</span>
          <MonoLabel>pinned</MonoLabel>
        </div>
        <div className={`text-[13px] text-muted ${ELLIPSIS}`}>
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
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`min-w-0 text-[14.5px] font-semibold ${ELLIPSIS}`}>{item.agent}</span>
          <span className={`${MONO} flex-none rounded-md border px-1.5 py-px ${TAG_COLOR[item.tone]}`}>{item.tag}</span>
        </div>
        <div className="line-clamp-2 text-[13px] leading-[1.35] text-ink-2">
          {driving ? 'You have control · its agent is paused' : item.preview}
        </div>
        <div className="text-[12px] text-muted">{item.role}</div>
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
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-line bg-bg [@media(max-width:1194px)]:col-start-1 [@media(max-width:1194px)]:row-[1/3]">
      <div className="flex flex-none flex-col gap-3.5 px-5 pt-[22px] pb-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="m-0 font-serif text-[36px] leading-[1.02] font-[350] tracking-[-0.025em]">Inbox</h1>
          <span className="text-[12.5px] text-muted">{clear ? 'All clear' : `${pendingCount} need you`}</span>
        </div>
        <label
          className={`flex h-[38px] min-w-0 items-center gap-2 rounded-full border border-line-2 bg-bg px-3.5 text-[13.5px] text-muted ${FOCUS_WITHIN}`}
        >
          <input
            ref={searchRef}
            className={`${BARE_INPUT} appearance-none`}
            type="text"
            value={query}
            placeholder="Search"
            aria-label="Search the inbox"
            onChange={(e) => onQuery(e.target.value)}
          />
          <span className="ml-auto">
            <KeyCap>/</KeyCap>
          </span>
        </label>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto *:shrink-0">
        <SectionLabel>Pilot</SectionLabel>
        <CapRow on={selected === 'cap'} clear={clear} onSelect={() => onSelect('cap')} />
        <SectionLabel>{clear ? 'Needs you · 0' : `Needs you · ${pendingCount} · newest first`}</SectionLabel>
        {clear ? (
          <div className={EMPTY_NOTE}>Nothing is waiting on you. The crew handles the rest.</div>
        ) : items.length === 0 ? (
          <div className={EMPTY_NOTE}>No match for “{query}”.</div>
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
