import { useSyncExternalStore } from 'react';
import type { ChatAction, ChatEvent } from '../../../shared/dto';

/** An owner message that main has not confirmed saving yet (or could not), shown at once and never lost. */
export interface PendingOwner {
  localId: string;
  text: string;
  status: 'sending' | 'failed';
  error?: string;
}

/** What is in flight for one chat on top of the saved thread. */
export interface LiveChat {
  pending: readonly PendingOwner[];
  /** The agent's reply being produced: `replyId` is null until main confirms the send; empty `text` means "typing". */
  reply: { replyId: string | null; text: string } | null;
  /** What Cap did beside answering (passed a note on), shown under the reply. */
  actions: readonly ChatAction[];
}

export const EMPTY_LIVE: LiveChat = { pending: [], reply: null, actions: [] };

export type LiveAction =
  | { type: 'sending'; localId: string; text: string }
  | { type: 'saved'; localId: string; replyId: string }
  | { type: 'send-failed'; localId: string; error: string }
  | { type: 'event'; event: ChatEvent };

const TYPING = { replyId: null, text: '' } as const;

export function reduceLive(state: LiveChat, action: LiveAction): LiveChat {
  switch (action.type) {
    case 'sending': {
      const others = state.pending.filter((p) => p.localId !== action.localId);
      return {
        pending: [...others, { localId: action.localId, text: action.text, status: 'sending' }],
        reply: { ...TYPING },
        actions: [],
      };
    }
    case 'saved':
      return {
        ...state,
        pending: state.pending.filter((p) => p.localId !== action.localId),
        reply: state.reply ? { ...state.reply, replyId: state.reply.replyId ?? action.replyId } : null,
      };
    case 'send-failed':
      return {
        ...state,
        pending: state.pending.map((p) =>
          p.localId === action.localId ? { ...p, status: 'failed', error: action.error } : p,
        ),
        reply: state.reply?.replyId === null ? null : state.reply,
      };
    case 'event': {
      const { event } = action;
      const mine = state.reply === null || state.reply.replyId === null || state.reply.replyId === event.replyId;
      if (!mine) return state; // a stale event of an earlier reply
      switch (event.type) {
        case 'thinking':
          return { ...state, reply: { replyId: event.replyId, text: state.reply?.text ?? '' } };
        case 'delta':
          return { ...state, reply: { replyId: event.replyId, text: (state.reply?.text ?? '') + event.text } };
        case 'done':
          return { ...state, reply: null };
        case 'actions':
          return { ...state, actions: event.actions };
      }
    }
  }
}

/** What the thread needs to draw, without the reply text: it changes only when a message appears, not per token. */
export interface LiveView {
  pending: readonly PendingOwner[];
  phase: 'none' | 'typing' | 'streaming';
  actions: readonly ChatAction[];
}

export const NO_VIEW: LiveView = { pending: [], phase: 'none', actions: [] };

const viewOf = (state: LiveChat): LiveView => ({
  pending: state.pending,
  phase: state.reply === null ? 'none' : state.reply.text === '' ? 'typing' : 'streaming',
  actions: state.actions,
});

const states = new Map<string, LiveChat>();
const views = new Map<string, LiveView>();
const listeners = new Set<() => void>();

export function dispatchLive(chatKey: string, action: LiveAction): void {
  const next = reduceLive(states.get(chatKey) ?? EMPTY_LIVE, action);
  states.set(chatKey, next);
  const view = viewOf(next);
  const prev = views.get(chatKey) ?? NO_VIEW;
  // Keep the same object while nothing the thread draws changed, so a token does not re-render the thread.
  if (view.pending !== prev.pending || view.phase !== prev.phase || view.actions !== prev.actions)
    views.set(chatKey, view);
  for (const listener of listeners) listener();
}

export function liveChat(chatKey: string): LiveChat {
  return states.get(chatKey) ?? EMPTY_LIVE;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getLiveView = (chatKey: string): LiveView => views.get(chatKey) ?? NO_VIEW;

export function useLiveView(chatKey: string): LiveView {
  return useSyncExternalStore(subscribe, () => getLiveView(chatKey));
}

/** The reply text so far; only the streaming bubble reads it. */
export function useReplyText(chatKey: string): string {
  return useSyncExternalStore(subscribe, () => liveChat(chatKey).reply?.text ?? '');
}

/** Test seam: forget all in-flight chat state. */
export function resetLiveChats(): void {
  states.clear();
  views.clear();
}
