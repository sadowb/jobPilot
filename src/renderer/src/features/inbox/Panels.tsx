import { useState, type ReactNode } from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { Eyebrow } from '../../components/ui';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import { Btn } from './Btn';
import type { ApprovalItem, NeedsYouItem } from '../../../../shared/dto';
import { agentWritten } from './model';
import type { ApprovalFlow } from './useApprovalFlow';
import { EYEBROW, NEED_CARD, NEED_PILL_SM } from './styles';

/** Right column shell. Scrolls when the window is short so the review actions stay reachable. */
export function PanelFrame({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-label="Details"
      className="relative flex min-h-0 min-w-0 flex-col gap-[18px] overflow-x-hidden overflow-y-auto border-l border-line bg-bg px-6 pt-[22px] pb-7 *:shrink-0"
    >
      {children}
    </aside>
  );
}

const RULE = 'border-t border-line';

function Section({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`flex flex-none flex-col gap-1.5 pt-3 ${RULE}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 border-0 bg-transparent p-0 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={EYEBROW}>{label}</span>
        <span className="text-[12.5px] text-muted">{open ? 'Hide ▴' : 'Show ▾'}</span>
      </button>
      {open && <div className="text-[13px]">{children}</div>}
    </div>
  );
}

const CV_LINE_WIDTHS = ['w-[92%]', 'w-full', 'w-[84%]', 'w-[96%]', 'w-[70%]', 'w-full', 'w-[88%]'];

function CvThumb() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[72px] w-[54px] flex-none flex-col gap-1 rounded-md border border-[rgb(228_224_214)] bg-[rgb(255_255_255)] px-[7px] py-2 shadow-[0_1px_2px_rgb(0_0_0/.08)]"
    >
      <i className="block h-1.5 w-[55%] rounded-xs bg-[rgb(17_17_17)]"></i>
      {CV_LINE_WIDTHS.map((w, i) => (
        <i key={i} className={`block h-[3px] rounded-xs bg-[rgb(168_163_144)] ${w}`}></i>
      ))}
    </div>
  );
}

const SOURCE = {
  owner: 'Your answer',
  library: 'Answer library',
  profile: 'Your profile',
  agent: 'Written by the agent',
} as const;

const bytes = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`;

/** Right column for an approval: exactly what the form will receive, then the one button that sends it. */
export function ReviewSidePanel({ item, flow }: { item: ApprovalItem; flow: ApprovalFlow }) {
  const { summary, cv } = item;
  const written = agentWritten(item);
  return (
    <PanelFrame>
      <div className="flex flex-none items-center justify-between gap-3">
        <Eyebrow>What will be sent · {summary.fields.length}</Eyebrow>
        <span className="text-[12.5px] text-muted">{item.siteHost}</span>
      </div>
      <div className="-mt-1.5 flex-none text-[12.5px] leading-[1.5] text-muted">
        Read back from the page itself. Nothing is sent until you approve, and only if the page still matches.
      </div>
      <div className="flex min-w-0 flex-none flex-row items-center gap-3.5 rounded-[18px] border border-line bg-bg p-3.5">
        <CvThumb />
        <div className="flex min-w-0 flex-col gap-[3px]">
          {cv ? (
            <>
              <div className="text-[14.5px] font-semibold">{cv.name}</div>
              <div className="text-[12.5px] text-muted">
                {cv.fileName} · {bytes(cv.sizeBytes)}
              </div>
              <div className="mt-1 text-[12.5px] text-muted">
                Pinned to this application. JobPilot cannot upload files itself yet, so check the form for an
                attachment.
              </div>
            </>
          ) : (
            <div className="text-[13.5px] text-muted">No CV is pinned to this application.</div>
          )}
        </div>
      </div>
      {written.length > 0 && (
        <div className={NEED_CARD} role="note">
          <div className="flex items-center justify-between gap-3">
            <span className={NEED_PILL_SM}>Written by the agent</span>
            <span className="text-[12px] text-muted">{written.length} to check</span>
          </div>
          {written.map((answer) => (
            <div
              key={answer.fieldKey}
              className="text-[13px] leading-[1.45] break-words whitespace-pre-wrap text-ink-2"
            >
              {answer.answer}
            </div>
          ))}
        </div>
      )}
      <Section label={`Fields · ${summary.fields.length}`} defaultOpen>
        <dl className="m-0 flex flex-col gap-2">
          {summary.fields.map((field, i) => (
            <div key={`${field.label}-${i}`} className="grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] gap-x-3">
              <dt className="break-words text-muted">{field.label}</dt>
              <dd className="m-0 break-words whitespace-pre-wrap">
                {field.value || <span className="text-muted">empty</span>}
              </dd>
            </div>
          ))}
        </dl>
        {summary.truncated && (
          <p className="m-0 mt-2 text-[12.5px] text-muted">
            More fields than are listed. Approval still covers the whole form.
          </p>
        )}
      </Section>
      {summary.answers.length > 0 && (
        <Section label={`Where answers came from · ${summary.answers.length}`}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {summary.answers.map((answer) => (
              <li key={answer.fieldKey} className="min-w-0">
                <div className="break-words whitespace-pre-wrap">{answer.answer}</div>
                <div className="text-[12px] text-muted">{SOURCE[answer.source]}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section label="Posting">
        <div className="break-all text-muted">{item.postingUrl}</div>
        <div className="mt-1 font-mono text-[12px] text-muted">Form {item.formRef}</div>
      </Section>
      {flow.error ? (
        <div role="alert" className="flex-none rounded-2xl border border-line bg-panel px-3.5 py-2.5 text-[13px]">
          {runErrorMessage(flow.error, 'Something went wrong. Nothing was sent.')}
        </div>
      ) : null}
      <div className="mt-auto flex flex-none flex-wrap items-center gap-2">
        <Btn size="sm" variant="danger" className="min-w-0 flex-1" disabled={flow.busy} onClick={flow.reject}>
          Reject
        </Btn>
        {flow.confirming ? (
          <>
            <Btn size="sm" disabled={flow.busy} onClick={flow.back}>
              Back
            </Btn>
            <Btn
              size="sm"
              variant="primary"
              className="min-w-0 flex-1"
              disabled={flow.busy}
              autoFocus
              onClick={flow.send}
            >
              {flow.sending ? 'Sending…' : `Yes, send to ${item.company}`}
            </Btn>
          </>
        ) : (
          <Btn size="sm" variant="primary" className="min-w-0 flex-1" disabled={flow.busy} onClick={flow.ask}>
            {item.state === 'submitting' ? 'Submitting…' : 'Approve and send'}
          </Btn>
        )}
      </div>
    </PanelFrame>
  );
}

/** Right column for a run that stopped: what it is waiting for. */
export function NeedsYouSidePanel({ item }: { item: NeedsYouItem }) {
  return (
    <PanelFrame>
      <div className="flex flex-none items-center justify-between gap-3">
        <Eyebrow>What Cap needs · {Math.max(1, item.questions.length)}</Eyebrow>
        <span className="text-[12.5px] text-muted">{item.siteHost}</span>
      </div>
      <div className={NEED_CARD}>
        <span className={`${NEED_PILL_SM} self-start`}>{item.questions.length > 0 ? 'Question' : 'Stuck'}</span>
        <div className="text-[13px] leading-[1.45] text-ink-2">
          {item.questions.length > 0
            ? 'Cap will not guess these. Answer them in the thread and the application is filled again with your answers.'
            : 'Fix whatever is blocking it, then run it again from the thread.'}
        </div>
      </div>
      {item.blockers.map((b) => (
        <div key={`${b.kind}-${b.message}`} className="text-[13px] text-muted">
          <span className="font-semibold text-ink-2">{b.kind}</span>: {b.message}
        </div>
      ))}
    </PanelFrame>
  );
}

/** Right column of the Cap thread: the chat is a board element main has no data for yet. */
export function PilotSidePanel() {
  return (
    <PanelFrame>
      <span className={EYEBROW}>Not connected yet</span>
      <div className="text-[13px] leading-[1.6] text-muted">
        Cap’s rules, memory and chat need pilot data that JobPilot does not expose yet. Nothing is shown here until it
        is real.
      </div>
    </PanelFrame>
  );
}

export function ClearCenter({
  stats,
  onDashboard,
  onAddJobs,
}: {
  stats: ReadonlyArray<{ label: string; value: string }>;
  onDashboard: () => void;
  onAddJobs: () => void;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-[26px] bg-ground px-12 py-8 text-center">
      <div className="relative h-[300px] w-[min(600px,100%)] flex-none overflow-hidden rounded-[28px] border border-line bg-bg">
        <svg className="absolute inset-0" viewBox="0 0 600 300" width="100%" height="100%" aria-hidden="true">
          <path
            className="animate-jp-dash"
            d="M-20 236 C 110 214, 190 120, 300 150 S 470 58, 620 46"
            fill="none"
            stroke="var(--line-2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 10"
          />
          <ellipse cx="96" cy="72" rx="48" ry="13" fill="var(--panel)" />
          <ellipse cx="500" cy="236" rx="62" ry="14" fill="var(--panel)" />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-jp-bob">
            <CapOnDartArt size={190} flying />
          </div>
        </div>
      </div>
      <div role="status" className="flex flex-col items-center gap-3">
        <Eyebrow>Inbox · all clear</Eyebrow>
        <h2 className="m-0 font-serif text-[64px] leading-[1.02] font-[350] tracking-[-0.025em]">
          All clear, <span className="font-serif text-[1em] font-light tracking-[-0.01em] italic">for now.</span>
        </h2>
        <p className="m-0 max-w-[520px] text-[16px] leading-[1.6] text-muted">
          Nothing needs you. I’ll flag the next question the moment it comes in.
        </p>
      </div>
      <div className="flex w-[min(560px,100%)] items-center gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-3xl border border-line bg-bg px-[18px] py-4"
          >
            <span className={EYEBROW}>{s.label}</span>
            <b className="font-serif text-[34px] leading-none font-normal">{s.value}</b>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2.5">
        <Btn variant="primary" onClick={onDashboard}>
          Back to Dashboard
        </Btn>
        <Btn onClick={onAddJobs}>Add jobs</Btn>
      </div>
    </section>
  );
}
