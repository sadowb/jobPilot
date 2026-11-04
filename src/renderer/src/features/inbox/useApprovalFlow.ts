import { useEffect, useState } from 'react';
import type { ApprovalItem } from '../../../../shared/dto';
import type { useApprove, useReject } from '../../lib/api';

export interface ApprovalMutations {
  approve: ReturnType<typeof useApprove>;
  reject: ReturnType<typeof useReject>;
  /** Called by the page, which outlives the card: the card unmounts as soon as the decision is refetched. */
  onNotice: (text: string) => void;
}

/**
 * Approve (two steps: ask, then confirm) and reject for one approval. The mutations belong to the page so their
 * `onSuccess` still fires after the decided card has left the list. Nothing is approved without a click on the one
 * confirm button; Escape backs out of the confirm step.
 */
export function useApprovalFlow(item: ApprovalItem, { approve, reject, onNotice }: ApprovalMutations) {
  const [confirming, setConfirming] = useState(false);
  const busy = approve.isPending || reject.isPending || item.state === 'submitting';

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirming(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming]);

  const latestFailure =
    reject.isError && (!approve.isError || reject.submittedAt > approve.submittedAt) ? reject.error : approve.error;

  return {
    confirming,
    busy,
    sending: approve.isPending,
    error: approve.isError || reject.isError ? latestFailure : null,
    ask: () => !busy && setConfirming(true),
    back: () => setConfirming(false),
    send: () => {
      if (!confirming || busy) return;
      approve.mutate(item.approvalId, {
        onSuccess: ({ outcome }) => {
          if (outcome === 'form_changed')
            onNotice(
              'The page changed after you reviewed it. Nothing was sent. JobPilot is filling it again and you will review the new version.',
            );
          else if (outcome === 'already_decided') onNotice('That one was already decided.');
        },
      });
    },
    reject: () => !busy && reject.mutate(item.approvalId),
  };
}

export type ApprovalFlow = ReturnType<typeof useApprovalFlow>;
