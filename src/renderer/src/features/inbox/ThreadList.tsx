import { forwardRef, type ReactNode } from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { V17AgentBot } from '../../components/V17AgentBot';
import { BARE_INPUT, ELLIPSIS, FOCUS_WITHIN, MONO } from './styles';
import { KeyHint as KeyCap } from './KeyHint';
import type { InboxItem } from './model';

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
      <span className={MONO}>{children}</span>
    </div>
  );
}

function CapRow({ on, onSelect }: { on: boolean; onSelect: () => void }) {
  return (
    <Row
      on={on}
      onSelect={onSelect}
      time=""
      lead={
        <span className="grid size-10 place-items-center">
          <CapOnDartArt size={38} />
        </span>
      }
    >
      <div className="flex min-w-0 flex-col gap-[3px]">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-semibold">Cap</span>
          <span className={MONO}>pinned</span>
        </div>
        <div className={`text-[13px] text-muted ${ELLIPSIS}`}>Ask me anything about your jobs</div>
      </div>
    </Row>
  );
}

function ItemRow({ item, on, onSelect }: { item: InboxItem; on: boolean; onSelect: () => void }) {
  return (
    <Row
      on={on}
      onSelect={onSelect}
      time={item.age}
      lead={<V17AgentBot name={item.agent} state={item.state} size={40} />}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`min-w-0 text-[14.5px] font-semibold ${ELLIPSIS}`}>{item.agent}</span>
          <span className={`${MONO} flex-none rounded-md border px-1.5 py-px ${TAG_COLOR[item.tone]}`}>{item.tag}</span>
        </div>
        <div className="line-clamp-2 text-[13px] leading-[1.35] text-ink-2">{item.preview}</div>
        <div className="text-[12px] text-muted">{item.role}</div>
      </div>
    </Row>
  );
}

export interface ThreadListProps {
  items: readonly InboxItem[];
  /** Pending count before the search filter (drives the headings). */
  pendingCount: number;
  /** The first load has not finished: show neither "All clear" nor a count. */
  loading?: boolean;
  /** An item key, or 'cap' for the pinned pilot thread. */
  selected: string | null;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (key: string) => void;
}

/** Left column: title, search, pinned Cap thread, and one thread per job that needs the owner. */
export const ThreadList = forwardRef<HTMLInputElement, ThreadListProps>(function ThreadList(
  { items, pendingCount, loading = false, selected, query, onQuery, onSelect },
  searchRef,
) {
  const clear = !loading && pendingCount === 0;
  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-line bg-bg [@media(max-width:1194px)]:col-start-1 [@media(max-width:1194px)]:row-[1/3]">
      <div className="flex flex-none flex-col gap-3.5 px-5 pt-[22px] pb-3">
        <div className="flex items-center justify-between gap-3">
          <h1
            id="inbox-heading"
            tabIndex={-1}
            className="m-0 font-serif outline-none text-[36px] leading-[1.02] font-[350] tracking-[-0.025em]"
          >
            Inbox
          </h1>
          <span className="text-[12.5px] text-muted">
            {loading ? '' : clear ? 'All clear' : `${pendingCount} need you`}
          </span>
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
        <CapRow on={selected === 'cap'} onSelect={() => onSelect('cap')} />
        <SectionLabel>
          {loading ? 'Needs you' : clear ? 'Needs you · 0' : `Needs you · ${pendingCount} · newest first`}
        </SectionLabel>
        {clear ? (
          <div className={EMPTY_NOTE}>Nothing is waiting on you. Sent jobs leave the Inbox.</div>
        ) : loading ? (
          <div className={EMPTY_NOTE}>Loading…</div>
        ) : items.length === 0 ? (
          <div className={`${EMPTY_NOTE} break-words`}>No match for “{query.slice(0, 60)}”.</div>
        ) : (
          items.map((item) => (
            <ItemRow key={item.key} item={item} on={selected === item.key} onSelect={() => onSelect(item.key)} />
          ))
        )}
      </div>
    </aside>
  );
});
