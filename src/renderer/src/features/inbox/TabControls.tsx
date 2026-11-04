import { useState } from 'react';
import type { InboxEntry } from '../../../../shared/dto';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import { useGoToTab, useHandBack, useTakeOver } from '../../lib/api';
import { Btn } from './Btn';

/**
 * Go to tab / Take over for a run whose tab is open (an approval waiting for review). Neo cannot switch its visible
 * tab for another program, so Go to tab names the tab to look for instead of pretending to focus it.
 */
export function TabControls({ item }: { item: InboxEntry }) {
  const goTo = useGoToTab();
  const takeOver = useTakeOver();
  const handBack = useHandBack();
  const [where, setWhere] = useState<string | null>(null);
  if (item.kind !== 'approval') {
    return <span className="text-[12.5px] text-muted">Its tab is closed. Saving your answers opens a new one.</span>;
  }
  const busy = goTo.isPending || takeOver.isPending || handBack.isPending;
  const failure = goTo.error ?? takeOver.error ?? handBack.error;
  const submitting = item.state === 'submitting';
  return (
    <>
      {failure ? (
        <span role="alert" className="max-w-[260px] text-[12.5px] text-bad">
          {runErrorMessage(failure, 'Could not reach the tab.')}
        </span>
      ) : where ? (
        <span role="status" className="max-w-[260px] text-[12.5px] text-muted">
          {where}
        </span>
      ) : item.takenOver ? (
        <span role="status" className="text-[12.5px] text-muted">
          You have the tab. The agent is paused.
        </span>
      ) : null}
      <Btn
        size="sm"
        disabled={busy}
        onClick={() =>
          goTo.mutate(item.runId, {
            onSuccess: (tab) =>
              setWhere(`Open Neo and look for the ${tab.host ?? 'application'} tab (page ${tab.tabId}).`),
          })
        }
      >
        Go to tab
      </Btn>
      {item.takenOver ? (
        <Btn
          size="sm"
          variant="primary"
          disabled={busy}
          onClick={() => {
            setWhere(null);
            handBack.mutate(item.runId);
          }}
        >
          Hand back
        </Btn>
      ) : (
        <Btn
          size="sm"
          disabled={busy || submitting}
          onClick={() => {
            setWhere(null);
            takeOver.mutate(item.runId);
          }}
        >
          Take over
        </Btn>
      )}
    </>
  );
}
