import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxEntry } from '../../../shared/dto';
import { V17AgentBot } from '../components/V17AgentBot';
import { CapOnDartArt } from '../components/CapOnDartArt';
import { Button } from '../components/ui';
import { Btn } from '../features/inbox/Btn';
import { Composer } from '../features/inbox/Composer';
import { ShortcutBar, ThreadHeader } from '../features/inbox/Frame';
import { MessageStream, type ThreadMessage } from '../features/inbox/Messages';
import { SHORTCUTS, entryKey, entryToItem, formatAge, type StepRow } from '../features/inbox/model';
import { ClearCenter, NeedsYouSidePanel, PilotSidePanel, ReviewSidePanel } from '../features/inbox/Panels';
import { ThreadList } from '../features/inbox/ThreadList';
import { useApprovalFlow, type ApprovalFlow } from '../features/inbox/useApprovalFlow';
import { ApprovalWidget, QuestionsWidget } from '../features/inbox/Widgets';
import { isTypingTarget } from '../features/inbox/dom';
import { useApplications, useInbox } from '../lib/api';

type Approval = Extract<InboxEntry, { kind: 'approval' }>;
type NeedsYou = Extract<InboxEntry, { kind: 'needs_you' }>;

const day = (at: number): ThreadMessage => ({
  kind: 'day',
  label: `Today · ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
});

function approvalThread(item: Approval, widget: ThreadMessage): ThreadMessage[] {
  const submitting = item.state === 'submitting';
  const steps: StepRow[] = [
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
    day(item.createdAt),
    { kind: 'steps', title: submitting ? 'Approved · submitting' : `Did ${steps.length - 1} steps`, rows: steps },
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
    day(item.createdAt),
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

function ApprovalThread({ item, flow }: { item: Approval; flow: ApprovalFlow }) {
  const messages = approvalThread(item, { kind: 'widget', node: <ApprovalWidget item={item} flow={flow} /> });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) flow.ask();
      else if (e.key.toLowerCase() === 'r') flow.reject();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <>
      <Header
        item={item}
        sub={`${item.siteHost} · ${item.state === 'submitting' ? 'submitting' : 'ready to review'}`}
      />
      <MessageStream messages={messages} threadKey={item.approvalId} />
      <Composer placeholder="Messaging this agent is not connected yet" onSend={() => undefined} disabled />
      <ShortcutBar shortcuts={SHORTCUTS.approval} />
    </>
  );
}

function Header({ item, sub }: { item: InboxEntry; sub: string }) {
  return (
    <ThreadHeader
      lead={<V17AgentBot name={item.company} state={entryToItem(item).state} size={36} />}
      title={`${item.company} · ${item.title}`}
      sub={sub}
    >
      <Btn size="sm" variant="ghost" disabled title="Not connected yet">
        Go to tab
      </Btn>
      <Btn size="sm" variant="ghost" disabled title="Not connected yet">
        Take over
      </Btn>
    </ThreadHeader>
  );
}

/** Everything that waits on the owner: one thread per job, with what will be sent in the right column. */
export function Inbox() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: entries = [], isError, isPending } = useInbox();
  const { data: applications = [] } = useApplications();
  const [selected, setSelected] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const items = useMemo(() => entries.map((entry) => entryToItem(entry)), [entries]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => `${i.agent} ${i.role} ${i.preview}`.toLowerCase().includes(q)) : items;
  }, [items, query]);
  const keys = ['cap', ...shown.map((i) => i.key)];
  const current =
    selected === 'cap'
      ? undefined
      : (entries.find((e) => entryKey(e) === selected) ?? entries.find((e) => entryKey(e) === shown[0]?.key));
  const view = selected === 'cap' ? 'cap' : current ? entryKey(current) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if ((e.key === 'j' || e.key === 'k') && !isTypingTarget(e.target)) {
        const at = keys.indexOf(view ?? 'cap');
        const next = keys[Math.max(0, Math.min(keys.length - 1, at + (e.key === 'j' ? 1 : -1)))];
        if (next) setSelected(next);
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
  const clear = !isPending && !isError && entries.length === 0;

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
            selected={view ?? null}
            query={query}
            onQuery={setQuery}
            onSelect={setSelected}
          />
          {clear ? (
            <div className="col-span-2 flex min-h-0 [@media(max-width:1194px)]:col-span-1 [@media(max-width:1194px)]:row-span-2">
              <ClearCenter stats={stats} onDashboard={() => void navigate('/')} onAddJobs={() => void navigate('/')} />
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
          ) : current?.kind === 'approval' ? (
            <ApprovalLayout key={current.approvalId} item={current} onNotice={setNotice} />
          ) : current?.kind === 'needs_you' ? (
            <NeedsLayout key={current.runId} item={current} />
          ) : (
            <section className="min-h-0 min-w-0 bg-ground" />
          )}
        </div>
      )}
    </main>
  );
}

function ApprovalLayout({ item, onNotice }: { item: Approval; onNotice: (text: string) => void }) {
  const flow = useApprovalFlow(item, onNotice);
  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-col bg-ground">
        <ApprovalThread item={item} flow={flow} />
      </section>
      <ReviewSidePanel item={item} flow={flow} />
    </>
  );
}

function NeedsLayout({ item }: { item: NeedsYou }) {
  const messages = needsYouThread(item, { kind: 'widget', node: <QuestionsWidget item={item} /> });
  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-col bg-ground">
        <Header item={item} sub={`${item.siteHost} · waiting ${formatAge(item.createdAt)}`} />
        <MessageStream messages={messages} threadKey={item.runId} />
        <Composer placeholder="Messaging this agent is not connected yet" onSend={() => undefined} disabled />
        <ShortcutBar shortcuts={SHORTCUTS.needs_you} />
      </section>
      <NeedsYouSidePanel item={item} />
    </>
  );
}
