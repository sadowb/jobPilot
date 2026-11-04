import { useState } from 'react';
import type { ApprovalItem } from '../../../../shared/dto';
import { Button, Card, Eyebrow, Status } from '../../components/ui';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import { useApprove, useReject } from '../../lib/api';

const SOURCE: Record<ApprovalItem['summary']['answers'][number]['source'], string> = {
  owner: 'Your answer',
  library: 'Answer library',
  profile: 'Your profile',
  agent: 'Written by the agent: check it',
};

const bytes = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`;

/** Everything that will be sent, read back from the page itself, and the one button that sends it. */
export function ReviewPanel({ item, onNotice }: { item: ApprovalItem; onNotice: (text: string) => void }) {
  const approve = useApprove();
  const reject = useReject();
  const [confirming, setConfirming] = useState(false);
  const busy = approve.isPending || reject.isPending || item.state === 'submitting';
  const { summary } = item;
  const agentWritten = summary.answers.filter((a) => a.source === 'agent');

  const onApprove = () =>
    approve.mutate(item.approvalId, {
      // The card disappears once decided, so the explanation lives on the page, not on the card.
      onSuccess: ({ outcome }) => {
        if (outcome === 'form_changed')
          onNotice(
            'The page changed after you reviewed it. Nothing was sent. JobPilot is filling it again and you will review the new version.',
          );
        else if (outcome === 'already_decided') onNotice('That one was already decided.');
      },
    });
  const failure = approve.error ?? reject.error;

  return (
    <section aria-labelledby="review-title" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-8 py-5">
        <div className="min-w-0">
          <Eyebrow>Review before sending · {item.siteHost}</Eyebrow>
          <h2
            id="review-title"
            className="m-0 mt-1 font-serif text-[30px] leading-[1.1] font-normal tracking-[-0.015em]"
          >
            {item.company}
          </h2>
          <p className="m-0 mt-1 text-[14.5px] text-ink-2">{item.title}</p>
        </div>
        <Status kind={item.state === 'pending' ? 'need' : 'work'}>
          {item.state === 'pending' ? 'Waiting for you' : 'Submitting'}
        </Status>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6">
        {failure && (
          <div role="alert" className="rounded-2xl border border-line bg-panel px-4 py-3 text-[13.5px] text-ink">
            {runErrorMessage(failure, 'Something went wrong. Nothing was sent.')}
          </div>
        )}

        {agentWritten.length > 0 && (
          <div role="note" className="rounded-2xl border border-need bg-need-tint px-4 py-3 text-[13.5px] text-need">
            {agentWritten.length} answer{agentWritten.length > 1 ? 's were' : ' was'} written by the agent, not taken
            from your profile. Read {agentWritten.length > 1 ? 'them' : 'it'} before you approve.
          </div>
        )}

        <Card className="p-5">
          <Eyebrow>What will be sent · {summary.fields.length} fields</Eyebrow>
          <dl className="m-0 mt-3 grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-5 gap-y-2.5 text-[14px]">
            {summary.fields.map((field, index) => (
              <div key={`${field.label}-${index}`} className="col-span-2 grid grid-cols-subgrid">
                <dt className="break-words text-muted">{field.label}</dt>
                <dd className="m-0 break-words whitespace-pre-wrap">
                  {field.value || <span className="text-muted">empty</span>}
                </dd>
              </div>
            ))}
          </dl>
          {summary.truncated && (
            <p className="m-0 mt-3 text-[12.5px] text-muted">
              The form has more fields than are listed here. Approval still covers the whole form.
            </p>
          )}
        </Card>

        {summary.answers.length > 0 && (
          <Card className="p-5">
            <Eyebrow>Where the answers came from</Eyebrow>
            <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0 text-[14px]">
              {summary.answers.map((answer) => (
                <li key={answer.fieldKey} className="min-w-0">
                  <div className="break-words whitespace-pre-wrap">{answer.answer}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">{SOURCE[answer.source]}</div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <Eyebrow>Files</Eyebrow>
          {item.cv ? (
            <p className="m-0 mt-3 text-[14px]">
              <span className="font-semibold">{item.cv.name}</span> · {item.cv.fileName} · {bytes(item.cv.sizeBytes)}
              <span className="mt-0.5 block text-[12.5px] text-muted">
                The CV pinned to this application. JobPilot does not upload files by itself yet, so check the form above
                for an attached file.
              </span>
            </p>
          ) : (
            <p className="m-0 mt-3 text-[14px] text-muted">No CV is pinned to this application.</p>
          )}
        </Card>

        <Card tone="panel" className="p-5">
          <Eyebrow>Posting</Eyebrow>
          <p className="m-0 mt-3 break-all text-[13.5px] text-ink-2">{item.postingUrl}</p>
          <p className="m-0 mt-1 font-mono text-[12px] text-muted">Form {item.formRef}</p>
        </Card>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel px-8 py-4">
        <p className="m-0 max-w-[34rem] text-[12.5px] text-muted">
          Approving sends exactly this form. If the page changes first, nothing is sent and you review it again.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" disabled={busy} onClick={() => reject.mutate(item.approvalId)}>
            Reject
          </Button>
          {confirming ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => setConfirming(false)}>
                Back
              </Button>
              <Button variant="primary" size="sm" disabled={busy} autoFocus onClick={onApprove}>
                {approve.isPending ? 'Sending…' : `Yes, send to ${item.company}`}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" disabled={busy} onClick={() => setConfirming(true)}>
              {item.state === 'submitting' ? 'Submitting…' : 'Approve and send'}
            </Button>
          )}
        </div>
      </footer>
    </section>
  );
}
