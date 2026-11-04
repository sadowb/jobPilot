import type { ChatMessage } from '../../../../shared/dto';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import { useSendChat } from '../../lib/api';
import { Composer } from './Composer';
import type { ThreadMessage } from './Messages';

export const chatBubbles = (chat: readonly ChatMessage[] | undefined): ThreadMessage[] =>
  (chat ?? []).map((m) => ({ kind: 'bubble', text: m.body, mine: m.role === 'owner' }));

/** The composer of a job thread (`applicationId`) or of Cap's pilot chat (`null`). */
export function ChatComposer({ applicationId, placeholder }: { applicationId: string | null; placeholder: string }) {
  const send = useSendChat(applicationId);
  return (
    <Composer
      placeholder={placeholder}
      pending={send.isPending}
      error={send.error ? runErrorMessage(send.error, 'Could not send that. Try again.') : null}
      onSend={(text) => send.mutateAsync(text)}
    />
  );
}
