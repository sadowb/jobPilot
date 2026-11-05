import type { ChatMessage } from '../../../../shared/dto';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import type { LiveView } from '../../lib/chat-live';
import type { ThreadMessage } from './threadMessage';

/**
 * The saved thread, then what is in flight: the owner's unsent messages (dimmed, or failed with a retry), and the
 * agent's reply as typing dots until the first token and a growing bubble after.
 */
export function chatThread(
  saved: readonly ChatMessage[] | undefined,
  live: LiveView,
  retry: (localId: string) => void,
  chatKey: string,
): ThreadMessage[] {
  return [
    ...(saved ?? []).map((m): ThreadMessage => ({ kind: 'bubble', text: m.body, mine: m.role === 'owner' })),
    ...live.pending.map((p): ThreadMessage => ({
      kind: 'bubble',
      text: p.text,
      mine: true,
      status: p.status,
      ...(p.status === 'failed'
        ? { error: runErrorMessage(new Error(p.error), 'Could not send that.'), onRetry: () => retry(p.localId) }
        : {}),
    })),
    ...(live.phase === 'none'
      ? []
      : live.phase === 'typing'
        ? [{ kind: 'typing' } as const]
        : [{ kind: 'bubble', text: '', streaming: true, liveKey: chatKey } as const]),
    ...live.actions.map((a): ThreadMessage => ({ kind: 'note', text: a.label })),
  ];
}

/** Starter replies for a job's thread and for Cap; plain questions the chat can answer from what it is shown. */
export const JOB_CHIPS = ['What do you need from me?', 'What did you fill in?', 'Keep the answers short and formal'];
export const CAP_CHIPS = ['What needs me right now?', 'What failed, and why?', 'What is running?'];
