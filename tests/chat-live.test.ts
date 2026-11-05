import { describe, expect, it, vi } from 'vitest';
import type { ChatEvent, ChatMessage } from '../src/shared/dto';
import { EMPTY_LIVE, reduceLive, type LiveAction, type LiveChat } from '../src/renderer/src/lib/chat-live';
import { chatThread } from '../src/renderer/src/features/inbox/chatThread';

const R1 = '01J0000000000000000000000A';
const R2 = '01J0000000000000000000000B';
const KEY = '01J000000000000000000000AP';
const run = (...actions: LiveAction[]): LiveChat => actions.reduce(reduceLive, EMPTY_LIVE);
const event = (
  e: Omit<Extract<ChatEvent, { type: 'delta' }>, 'chatKey'> | { type: 'thinking' | 'done'; replyId: string },
) => ({ type: 'event', event: { chatKey: KEY, ...e } }) as LiveAction;
const delta = (replyId: string, text: string) => event({ type: 'delta', replyId, text });

describe('live chat state (#255)', () => {
  it('shows the owner message and the typing indicator the moment they send', () => {
    const live = run({ type: 'sending', localId: 'a', text: 'hello' });
    expect(live.pending).toEqual([{ localId: 'a', text: 'hello', status: 'sending' }]);
    expect(live.reply).toEqual({ replyId: null, text: '' });
    expect(chatThread([], live, vi.fn()).map((m) => m.kind)).toEqual(['bubble', 'typing']);
  });

  it('streams deltas into one growing reply and ends it on done', () => {
    const live = run(
      { type: 'sending', localId: 'a', text: 'hi' },
      { type: 'saved', localId: 'a', replyId: R1 },
      event({ type: 'thinking', replyId: R1 }),
      delta(R1, 'Hel'),
      delta(R1, 'lo'),
    );
    expect(live.pending).toEqual([]);
    expect(live.reply).toEqual({ replyId: R1, text: 'Hello' });
    expect(chatThread([], live, vi.fn()).at(-1)).toMatchObject({ kind: 'bubble', text: 'Hello', streaming: true });
    expect(reduceLive(live, event({ type: 'done', replyId: R1 })).reply).toBeNull();
  });

  it('accepts events that arrive before the send is confirmed', () => {
    const live = run(
      { type: 'sending', localId: 'a', text: 'hi' },
      event({ type: 'thinking', replyId: R1 }),
      delta(R1, 'Hi'),
      { type: 'saved', localId: 'a', replyId: R1 },
    );
    expect(live.reply).toEqual({ replyId: R1, text: 'Hi' });
  });

  it('ignores late events of an earlier reply', () => {
    const live = run(
      { type: 'sending', localId: 'a', text: 'hi' },
      event({ type: 'thinking', replyId: R2 }),
      delta(R1, 'stale'),
      event({ type: 'done', replyId: R1 }),
    );
    expect(live.reply).toEqual({ replyId: R2, text: '' });
  });

  it('keeps a failed message with its text and a retry, and drops the typing indicator', () => {
    const live = run(
      { type: 'sending', localId: 'a', text: 'do not lose me' },
      { type: 'send-failed', localId: 'a', error: 'offline' },
    );
    expect(live.reply).toBeNull();
    const retry = vi.fn();
    const [bubble] = chatThread([], live, retry);
    expect(bubble).toMatchObject({ kind: 'bubble', mine: true, text: 'do not lose me', status: 'failed' });
    (bubble as { onRetry: () => void }).onRetry();
    expect(retry).toHaveBeenCalledWith('a');
    const again = reduceLive(live, { type: 'sending', localId: 'a', text: 'do not lose me' });
    expect(again.pending).toHaveLength(1);
    expect(again.pending[0]!.status).toBe('sending');
  });

  it('lists saved messages first, then in-flight ones, then what Cap did', () => {
    const saved: ChatMessage[] = [{ id: R1, role: 'agent', body: 'earlier', createdAt: 1 }];
    const live = run(
      { type: 'sending', localId: 'a', text: 'next' },
      {
        type: 'event',
        event: { type: 'actions', chatKey: KEY, replyId: R1, actions: [{ kind: 'relay', label: 'Passed to Acme' }] },
      },
    );
    expect(chatThread(saved, live, vi.fn()).map((m) => m.kind)).toEqual(['bubble', 'bubble', 'typing', 'note']);
  });
});
