import { useState } from 'react';
import type { ApprovalItem } from '../../../../shared/dto';
import { useApprove, useReject } from '../../lib/api';

/** Approve (two steps: ask, then confirm) and reject for one approval. Main decides what an approval means. */
export function useApprovalFlow(item: ApprovalItem, onNotice: (text: string) => void) {
  const approve = useApprove();
  const reject = useReject();
  const [confirming, setConfirming] = useState(false);
  const busy = approve.isPending || reject.isPending || item.state === 'submitting';
  return {
    confirming,
    busy,
    sending: approve.isPending,
    error: approve.error ?? reject.error,
    ask: () => !busy && setConfirming(true),
    back: () => setConfirming(false),
    send: () =>
      approve.mutate(item.approvalId, {
        // The card disappears once decided, so the explanation lives on the page, not on the card.
        onSuccess: ({ outcome }) => {
          if (outcome === 'form_changed')
            onNotice(
              'The page changed after you reviewed it. Nothing was sent. JobPilot is filling it again and you will review the new version.',
            );
          else if (outcome === 'already_decided') onNotice('That one was already decided.');
        },
      }),
    reject: () => !busy && reject.mutate(item.approvalId),
  };
}

export type ApprovalFlow = ReturnType<typeof useApprovalFlow>;
