import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxEntry } from '../../../shared/dto';
import { V17AgentBot } from '../components/V17AgentBot';
import { CapOnDartArt } from '../components/CapOnDartArt';
import { Button } from '../components/ui';
import { Composer } from '../features/inbox/Composer';
import { ShortcutBar, ThreadHeader } from '../features/inbox/Frame';
import { MessageStream, type ThreadMessage } from '../features/inbox/Messages';
import { SHORTCUTS, entryKey, entryToItem, formatAge, type StepRow } from '../features/inbox/model';
import { ClearCenter, NeedsYouSidePanel, PilotSidePanel, ReviewSidePanel } from '../features/inbox/Panels';
import { TabControls } from '../features/inbox/TabControls';
import { ThreadList } from '../features/inbox/ThreadList';
import { useApprovalFlow, type ApprovalMutations } from '../features/inbox/useApprovalFlow';
import { ApprovalWidget, QuestionsWidget, type AnswerState } from '../features/inbox/Widgets';
import { isTypingTarget } from '../features/inbox/dom';
import { useAnswerRun, useApplications, useApprove, useInbox, useReject, useStartRun } from '../lib/api';

type Approval = Extract<InboxEntry, { kind: 'approval' }>;
type NeedsYou = Extract<InboxEntry, { kind: 'needs_you' }>;

const dayLabel = (at: number): ThreadMessage => {
  const d = new Date(at);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return {
    kind: 'day',
    label: `${d.toDateString() === new Date().toDateString() ? 'Today' : d.toLocaleDateString()} · ${time}`,
  };
};

const steps = (rows: StepRow[]) => rows.filter((r) => r.tone === 'ok').length;

function approvalThread(item: Approval, widget: ThreadMessage): ThreadMessage[] {
  const submitting = item.state === 'submitting';
  const rows: StepRow[] = [
    { tone: 'ok', label: 'Read the posting', meta: item.siteHost },
    { tone: 'ok', label: `Filled ${item.summary.fields.length} fields`, meta: String(item.summary.fields.length) },
    ...(submitting
      ? ([
          { tone: 'ok', label: 'You approved this exact form', meta: item.formRef },
          { tone: 'now', label: 'Submitting', meta: 'now' },
        ] as StepRow[])
      : ([{ tone: 'wait', label: 'Stopped for your review', meta: 'now' }] as StepRow[])),
  ];
  const written = item.summary.answers.filter((a) => a.source === 'agent').length;
  return [
    dayLabel(item.createdAt),
    { kind: 'steps', title: submitting ? 'Approved · submitting' : `Did ${steps(rows)} steps`, rows },
    {
      kind: 'bubble',
      text: `The form is filled with ${item.summary.fields.length} fields, read back from the page.${written ? ` ${written} answer${written > 1 ? 's were' : ' was'} written by me, not taken from your profile, so please check ${written > 1 ? 'them' : 'it'}.` : ''}`,
    },
    widget,
  ];
}

function needsYouThread(item: NeedsYou, widget: ThreadMessage): ThreadMessage[] {
  const stuck = item.questions.length === 0;
  return [
    dayLabel(item.createdAt),
    {
      kind: 'steps',
      title: stuck ? 'Stopped' : 'Stopped at a question',
      rows: [
        { tone: 'ok', label: 'Read the posting', meta: item.siteHost },
        { tone: 'wait', label: stuck ? 'Needs a hand' : `${item.questions.length} to answer`, meta: 'now' },
      ],
    },
    ...(item.reason ? ([{ kind: 'bubble', text: item.reason }] as ThreadMessage[]) : []),
    ...item.blockers.map((b): ThreadMessage => ({ kind: 'bubble', text: `${b.kind}: ${b.message}` })),
    widget,
  ];
}

/** Tab controls exist for runs with an open tab; a stopped run says its tab is closed. */
function Header({ item, sub }: { item: InboxEntry; sub: string }) {
  return (
    <ThreadHeader
      lead={<V17AgentBot name={item.company} state={entryToItem(item).state} size={36} />}
      title={`${item.company} · ${item.title}`}
      sub={sub}
    >
      <TabControls item={item} />
    </ThreadHeader>
  );
}

function ApprovalLayout({ item, mutations, now }: { item: Approval; mutations: ApprovalMutations; now: number }) {
  const flow = useApprovalFlow(item, mutations);
  const messages = approvalThread(item, { kind: 'widget', node: <ApprovalWidget item={item} flow={flow} /> });
  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-col bg-ground">
        <Header
          item={item}
          sub={`${item.siteHost} · ${item.state === 'submitting' ? 'submitting' : 'ready to review'} · ${formatAge(item.createdAt, now)}`}
        />
        <MessageStream messages={messages} threadKey={item.approvalId} />
        <Composer placeholder="Messaging this agent is not connected yet" onSend={() => undefined} disabled />
        <ShortcutBar shortcuts={SHORTCUTS.approval} />
      </section>
      <ReviewSidePanel item={item} flow={flow} />
    </>
  );
}

function NeedsLayout({
  item,
  answer,
  restart,
  now,
}: {
  item: NeedsYou;
  answer: AnswerState;
  restart: { pending: boolean; error: unknown; run: () => void };
  now: number;
}) {
  const messages = needsYouThread(item, {
    kind: 'widget',
    node: <QuestionsWidget item={item} answer={answer} restart={restart} />,
  });
  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-col bg-ground">
        <Header item={item} sub={`${item.siteHost} · waiting ${formatAge(item.createdAt, now)}`} />
        <MessageStream messages={messages} threadKey={item.runId} />
        <Composer placeholder="Messaging this agent is not connected yet" onSend={() => undefined} disabled />
        <ShortcutBar shortcuts={SHORTCUTS.needs_you} />
      </section>
      <NeedsYouSidePanel item={item} />
    </>
  );
}

const centerNote = (title: string, body: string) => (
  <section className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-2 bg-ground px-12 text-center">
    <h2 className="m-0 text-[16px] font-semibold">{title}</h2>
    <p className="m-0 max-w-[420px] text-[14px] leading-[1.5] text-muted">{body}</p>
  </section>
);

/** Everything that waits on the owner: one thread per job, with what will be sent in the right column. */
export function Inbox() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: entries = [], isError, isPending } = useInbox();
  const { data: applications = [] } = useApplications();
  const approve = useApprove();
  const reject = useReject();
  const answer = useAnswerRun();
  const restart = useStartRun();
  const [selected, setSelected] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [filling, setFilling] = useState<{ applicationId: string; company: string; title: string; at: number } | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(() => entries.map((entry) => entryToItem(entry, now)), [entries, now]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => `${i.agent} ${i.role} ${i.preview}`.toLowerCase().includes(q)) : items;
  }, [items, query]);
  const keys = ['cap', ...shown.map((i) => i.key)];
  // The open thread is always one of the rows the list shows, so the search box and the thread cannot disagree.
  const current =
    selected === 'cap'
      ? undefined
      : (shown.find((i) => i.key === selected) ?? shown[0]) &&
        entries.find((e) => entryKey(e) === (shown.find((i) => i.key === selected) ?? shown[0])!.key);
  const view = selected === 'cap' ? 'cap' : current ? entryKey(current) : undefined;
  const waitingForRefill =
    filling !== null &&
    // Only while the refill is really under way; a run that ended some other way must not pin the placeholder.
    ['queued', 'running'].includes(applications.find((a) => a.id === filling.applicationId)?.latestRunStatus ?? '') &&
    !entries.some((e) => e.applicationId === filling.applicationId && e.createdAt > filling.at);

  // The next thread takes over after a decision; keep keyboard focus on a stable element instead of losing it.
  const count = useRef(entries.length);
  useEffect(() => {
    if (entries.length < count.current) document.getElementById('inbox-heading')?.focus();
    count.current = entries.length;
  }, [entries.length]);

  // Errors belong to the thread they happened in.
  useEffect(() => {
    approve.reset();
    reject.reset();
    answer.reset();
    restart.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the open thread changes
  }, [view]);

  const select = (key: string) => {
    setFilling(null);
    setSelected(key);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'j' || e.key === 'k') {
        const at = keys.indexOf(view ?? 'cap');
        const next = keys[Math.max(0, Math.min(keys.length - 1, at + (e.key === 'j' ? 1 : -1)))];
        if (next) select(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stats = [
    { label: 'Running', value: String(applications.filter((a) => a.latestRunStatus === 'running').length) },
    {
      label: 'Up next',
      value: String(applications.filter((a) => a.appliedAt === null && a.latestRunStatus !== 'running').length),
    },
    { label: 'Sent', value: String(applications.filter((a) => a.appliedAt !== null).length) },
  ];
  const clear = !isPending && !isError && entries.length === 0 && !waitingForRefill;
  const mutations: ApprovalMutations = { approve, reject, onNotice: setNotice };

  return (
    <main className="box-border flex h-[calc(100vh-var(--app-toolbar-height))] min-h-0 flex-col">
      {notice && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-line bg-panel px-7 py-3 text-[13.5px]"
        >
          <span>{notice}</span>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
            Dismiss
          </Button>
        </div>
      )}
      {isError ? (
        <div role="alert" className="m-14 rounded-3xl border border-line bg-bg p-10 text-center text-[14px] text-muted">
          The Inbox could not be loaded.
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[336px_minmax(0,1fr)_384px] border-t border-line [@media(max-width:1194px)]:grid-cols-[336px_minmax(0,1fr)] [@media(max-width:1194px)]:grid-rows-[minmax(0,1fr)_minmax(0,40%)]">
          <ThreadList
            ref={searchRef}
            items={shown}
            pendingCount={entries.length}
            loading={isPending}
            selected={view ?? null}
            query={query}
            onQuery={setQuery}
            onSelect={select}
          />
          {clear ? (
            <div className="col-span-2 flex min-h-0 [@media(max-width:1194px)]:col-span-1 [@media(max-width:1194px)]:row-span-2">
              <ClearCenter stats={stats} onDashboard={() => void navigate('/')} />
            </div>
          ) : view === 'cap' ? (
            <>
              <section className="flex min-h-0 min-w-0 flex-col bg-ground">
                <ThreadHeader
                  lead={<CapOnDartArt size={36} />}
                  title="Cap"
                  sub="Your pilot · chat is not connected yet"
                />
                <div className="flex min-h-0 flex-1 items-center justify-center px-12 text-center text-[14px] text-muted">
                  Cap’s chat and morning brief need data JobPilot does not have yet. Nothing is shown until it is real.
                </div>
                <Composer placeholder="Message Cap (not connected yet)" onSend={() => undefined} disabled />
                <ShortcutBar shortcuts={SHORTCUTS.pilot} />
              </section>
              <PilotSidePanel />
            </>
          ) : waitingForRefill && filling ? (
            centerNote(
              'Saved, filling again',
              `${filling.company} · ${filling.title} is being filled with your answers. It comes back here when it needs you again or is ready to review.`,
            )
          ) : current?.kind === 'approval' ? (
            <ApprovalLayout key={current.approvalId} item={current} mutations={mutations} now={now} />
          ) : current?.kind === 'needs_you' ? (
            <NeedsLayout
              key={current.runId}
              item={current}
              now={now}
              answer={{
                pending: answer.isPending,
                error: answer.error,
                submit: (answers) =>
                  answer.mutate(
                    { runId: current.runId, answers },
                    {
                      onSuccess: () =>
                        setFilling({
                          applicationId: current.applicationId,
                          company: current.company,
                          title: current.title,
                          at: Date.now(),
                        }),
                    },
                  ),
              }}
              restart={{
                pending: restart.isPending,
                error: restart.error,
                run: () => restart.mutate(current.applicationId),
              }}
            />
          ) : (
            centerNote(
              query ? 'No match' : 'Nothing selected',
              query
                ? 'No thread matches your search. Clear it to see every job that needs you.'
                : 'Pick a job on the left.',
            )
          )}
        </div>
      )}
    </main>
  );
}
