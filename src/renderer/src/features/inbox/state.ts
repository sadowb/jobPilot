import { INBOX_ITEMS, type InboxItem, type ItemId, type ThreadId, baseThread, type ThreadMessage } from './model';

/**
 * Inbox UI state. UI only: take over / hand back never touch a browser (see browserSeam.ts); resolving an
 * item is local until the API exists.
 */
export interface InboxState {
  /** `null` = nothing selected; with nothing pending that is the "all clear" view. */
  selected: ThreadId | null;
  resolved: readonly ItemId[];
  takeover: ItemId | null;
  /** Owner messages sent from the composer, per thread (shown as user bubbles). */
  sent: Readonly<Partial<Record<ThreadId, readonly string[]>>>;
}

export type InboxAction =
  | { type: 'select'; id: ThreadId }
  | { type: 'resolve'; id: ItemId }
  | { type: 'takeOver'; id: ItemId }
  | { type: 'handBack'; id: ItemId }
  | { type: 'move'; dir: 1 | -1 }
  | { type: 'send'; id: ThreadId; text: string };

export const initialInboxState: InboxState = { selected: 'figma', resolved: [], takeover: null, sent: {} };

export const pendingItems = (s: Pick<InboxState, 'resolved'>): readonly InboxItem[] =>
  INBOX_ITEMS.filter((i) => !s.resolved.includes(i.id));

export type InboxView = 'review' | 'pilot' | 'takeover' | 'clear';

/** Which board the state corresponds to. */
export function viewOf(s: InboxState): InboxView {
  if (s.selected === 'cap') return 'pilot';
  if (s.selected === null) return 'clear';
  return s.takeover === s.selected ? 'takeover' : 'review';
}

const isPending = (s: InboxState, id: ThreadId) => id === 'cap' || !s.resolved.includes(id);

/** The pending item after `from` in list order, wrapping; first item when `from` is not a pending item. */
export function stepSelection(s: InboxState, dir: 1 | -1): ItemId | null {
  const pending = pendingItems(s);
  if (pending.length === 0) return null;
  const at = pending.findIndex((i) => i.id === s.selected);
  if (at === -1) return (dir === 1 ? pending[0] : pending[pending.length - 1])!.id;
  return pending[(at + dir + pending.length) % pending.length]!.id;
}

/** The first pending item after `id` in list order, wrapping to the top; null when none is left. */
function nextPendingAfter(resolved: readonly ItemId[], id: ItemId): ItemId | null {
  const at = INBOX_ITEMS.findIndex((i) => i.id === id);
  const ordered = [...INBOX_ITEMS.slice(at + 1), ...INBOX_ITEMS.slice(0, at)];
  return ordered.find((i) => !resolved.includes(i.id))?.id ?? null;
}

export function inboxReducer(s: InboxState, a: InboxAction): InboxState {
  switch (a.type) {
    case 'select':
      return isPending(s, a.id) ? { ...s, selected: a.id } : s;
    case 'move': {
      const next = stepSelection(s, a.dir);
      return next ? { ...s, selected: next } : s;
    }
    case 'takeOver':
      // One take-over at a time (the boards show a single "You have control" banner).
      return isPending(s, a.id) && s.takeover === null ? { ...s, selected: a.id, takeover: a.id } : s;
    case 'handBack':
    case 'resolve': {
      if (!isPending(s, a.id)) return s;
      const resolved = [...s.resolved, a.id];
      const takeover = s.takeover === a.id ? null : s.takeover;
      if (s.selected !== a.id) return { ...s, resolved, takeover };
      return { ...s, resolved, takeover, selected: nextPendingAfter(resolved, a.id) };
    }
    case 'send': {
      const text = a.text.trim();
      if (!text || !isPending(s, a.id)) return s;
      return { ...s, sent: { ...s.sent, [a.id]: [...(s.sent[a.id] ?? []), text] } };
    }
  }
}

/** Static thread + the owner's sent messages appended as user bubbles. */
export function threadMessages(s: InboxState, id: ThreadId): readonly ThreadMessage[] {
  const sent: ThreadMessage[] = (s.sent[id] ?? []).map((text) => ({ kind: 'bubble', side: 'u', text }));
  return [...baseThread(id, s.takeover === id), ...sent];
}

/** A line is a "word" per whitespace-separated run; matches the "104 / 150 words" counter on the board. */
export const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;
