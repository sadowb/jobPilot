import { useEffect } from 'react';
import { useChatThread } from '../../lib/api';
import { CAP_CHIPS, JOB_CHIPS, chatThread } from './chatThread';
import { Composer } from './Composer';
import type { ThreadMessage } from './Messages';

export { CAP_CHIPS, JOB_CHIPS };

/**
 * A job's thread (`applicationId`) or Cap's pilot chat (`null`): its messages and its composer share one live state.
 * `before` is what the page already shows above the chat (the questions, the review card).
 */
export function useChatView(applicationId: string | null, before: ThreadMessage[]) {
  const thread = useChatThread(applicationId);
  return {
    thread,
    messages: [...before, ...chatThread(thread.saved, thread.live, thread.retry, applicationId ?? 'cap', thread.undo)],
    busy: thread.live.phase !== 'none',
  };
}

/** The composer of a job thread (`applicationId`) or of Cap's pilot chat (`null`). */
export function ChatComposer({
  applicationId,
  placeholder,
  thread,
  chips,
}: {
  applicationId: string | null;
  placeholder: string;
  thread: ReturnType<typeof useChatThread>;
  chips: readonly string[];
}) {
  const { warm } = thread;
  // Opening a chat is the cue to get the agent ready, so the first reply does not wait for a cold start.
  useEffect(() => warm(), [applicationId, warm]);
  return (
    <Composer
      key={applicationId ?? 'cap'}
      placeholder={placeholder}
      replying={thread.live.phase !== 'none'}
      chips={chips}
      onSend={(text) => void thread.send(text)}
      onStop={thread.cancel}
    />
  );
}
