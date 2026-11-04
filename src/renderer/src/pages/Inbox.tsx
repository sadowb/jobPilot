import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { V17CapDart } from '../components/V17CapDart';
import { AppButton } from '../features/dashboard/components/AppButton';
import { InboxList, entryKey } from '../features/inbox/InboxList';
import { NeedsYouPanel } from '../features/inbox/NeedsYouPanel';
import { ReviewPanel } from '../features/inbox/ReviewPanel';
import { useInbox } from '../lib/api';

/** Everything that waits on the owner: forms to approve and questions to answer. */
export function Inbox() {
  const navigate = useNavigate();
  const { data: entries = [], isError, isPending } = useInbox();
  const [selected, setSelected] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const current = entries.find((entry) => entryKey(entry) === selected) ?? entries[0];

  return (
    <main className="box-border flex h-[calc(100vh-var(--app-toolbar-height))] flex-col gap-3.5 px-14 pt-5 pb-[34px]">
      <h1 className="m-0 font-serif text-[42px] leading-[1.02] font-[350] tracking-[-0.025em]">Inbox</h1>
      {notice && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-[13.5px]"
        >
          <span>{notice}</span>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
            Dismiss
          </Button>
        </div>
      )}
      {isError ? (
        <div role="alert" className="rounded-3xl border border-line bg-bg p-10 text-center text-[14px] text-muted">
          The Inbox could not be loaded.
        </div>
      ) : !isPending && entries.length === 0 ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-line bg-bg p-10 text-center"
          role="status"
        >
          <V17CapDart size={96} />
          <div className="mt-2 font-serif text-[30px] leading-[1.1] font-normal tracking-[-0.015em]">
            Nothing needs you
          </div>
          <div className="max-w-[470px] text-[14px] leading-[1.55] text-muted">
            When an agent needs an answer or an application is ready to review, it shows up here.
          </div>
          <AppButton variant="primary" size="sm" className="mt-2" onClick={() => void navigate('/')}>
            Open Up next
          </AppButton>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] overflow-hidden rounded-3xl border border-line bg-bg">
          <div className="min-h-0 overflow-hidden border-r border-line">
            <InboxList entries={entries} selected={current ? entryKey(current) : undefined} onSelect={setSelected} />
          </div>
          {current?.kind === 'approval' && <ReviewPanel key={current.approvalId} item={current} onNotice={setNotice} />}
          {current?.kind === 'needs_you' && <NeedsYouPanel key={current.runId} item={current} />}
        </div>
      )}
    </main>
  );
}
