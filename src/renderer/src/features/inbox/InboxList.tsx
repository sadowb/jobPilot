import { useRef, type KeyboardEvent } from 'react';
import type { InboxEntry } from '../../../../shared/dto';
import { Status, cn } from '../../components/ui';

export const entryKey = (entry: InboxEntry) => (entry.kind === 'approval' ? entry.approvalId : entry.runId);

function label(entry: InboxEntry): { kind: 'need' | 'work' | 'bad'; text: string } {
  if (entry.kind === 'approval')
    return entry.state === 'pending' ? { kind: 'need', text: 'Review' } : { kind: 'work', text: 'Submitting' };
  return entry.questions.length > 0 ? { kind: 'need', text: 'Question' } : { kind: 'bad', text: 'Stuck' };
}

/** Listbox of everything waiting on the owner. Arrow keys move the selection, Home/End jump. */
export function InboxList({
  entries,
  selected,
  onSelect,
}: {
  entries: readonly InboxEntry[];
  selected: string | undefined;
  onSelect: (key: string) => void;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const move = (event: KeyboardEvent, index: number) => {
    const target =
      event.key === 'ArrowDown'
        ? index + 1
        : event.key === 'ArrowUp'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? entries.length - 1
              : undefined;
    if (target === undefined) return;
    event.preventDefault();
    const next = entries[Math.max(0, Math.min(entries.length - 1, target))];
    if (!next) return;
    onSelect(entryKey(next));
    refs.current.get(entryKey(next))?.focus();
  };
  return (
    <div role="listbox" aria-label="Waiting on you" className="flex min-h-0 flex-col gap-1 overflow-y-auto p-2">
      {entries.map((entry, index) => {
        const key = entryKey(entry);
        const active = key === selected;
        const tag = label(entry);
        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            ref={(node) => {
              if (node) refs.current.set(key, node);
              else refs.current.delete(key);
            }}
            onClick={() => onSelect(key)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'flex w-full min-w-0 flex-col gap-1.5 rounded-2xl border px-3.5 py-3 text-left transition-colors',
              active ? 'border-ink bg-hover' : 'border-transparent hover:bg-hover',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[14.5px] font-semibold">{entry.company}</span>
              <Status kind={tag.kind}>{tag.text}</Status>
            </span>
            <span className="truncate text-[13px] text-ink-2">{entry.title}</span>
            <span className="truncate font-mono text-[11.5px] text-muted">{entry.siteHost}</span>
          </button>
        );
      })}
    </div>
  );
}
