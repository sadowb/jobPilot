import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapOnDartArt } from '../components/CapOnDartArt';
import { CritterBot } from '../components/CritterBot';
import { KeyCap } from '../components/KeyCap';
import { useFillViewportHeight } from '../components/useFillViewportHeight';
import { Composer } from '../features/inbox/Composer';
import { ControlBanner, ShortcutBar, ThreadHeader } from '../features/inbox/Frame';
import { ConsentWidget, MessageStream, ReviewWidget, type ReviewDraft } from '../features/inbox/Messages';
import {
  ConsentPanel,
  ClearCenter,
  LiveTabPanel,
  PilotPanel,
  ReviewPanel,
  UpNextPanel,
} from '../features/inbox/Panels';
import { ThreadList } from '../features/inbox/ThreadList';
import { isTypingTarget } from '../features/inbox/dom';
import { commandFor, type InboxCommand } from '../features/inbox/hotkeys';
import { FIGMA_QUESTION, SHORTCUTS_BY_VIEW, itemById, type ItemId } from '../features/inbox/model';
import {
  countWords,
  inboxReducer,
  initialInboxState,
  pendingItems,
  threadMessages,
  viewOf,
} from '../features/inbox/state';
import '../features/inbox/inbox.css';

const matches = (q: string, ...fields: string[]) => {
  const needle = q.trim().toLowerCase();
  return !needle || fields.some((f) => f.toLowerCase().includes(needle));
};

const COMPOSER_PLACEHOLDER = {
  cap: 'Tell Cap… links, rules, “why was I rejected?”',
  agent: (agent: string) => `Message the ${agent} agent… it reads this before it continues`,
  driving: (agent: string) => `The ${agent} agent is paused while you drive…`,
} as const;

/** Inbox: the pilot thread, the items that need the owner, and take over / hand back (UI states only). */
export function Inbox() {
  const [state, dispatch] = useReducer(inboxReducer, initialInboxState);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string>(FIGMA_QUESTION.draft);
  const [editing, setEditing] = useState(false);
  const [editSeenSelection, setEditSeenSelection] = useState(state.selected);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [pane, setPane] = useState<'chat' | 'details'>('chat');
  useFillViewportHeight(rootRef);

  // Leaving a thread ends any edit in progress (the draft text is kept).
  if (editSeenSelection !== state.selected) {
    setEditSeenSelection(state.selected);
    setEditing(false);
  }

  const view = viewOf(state);
  const pending = pendingItems(state);
  const visible = useMemo(
    () => pending.filter((i) => matches(query, i.agent, i.role, i.preview, i.tag)),
    [pending, query],
  );
  const selectedItem = state.selected && state.selected !== 'cap' ? itemById(state.selected) : null;
  const words = countWords(draft);

  const resolve = useCallback((id: ItemId) => dispatch({ type: 'resolve', id }), []);
  const accept = useCallback(() => {
    if (words === 0 || words > FIGMA_QUESTION.wordLimit) return;
    setEditing(false);
    resolve('figma');
  }, [words, resolve]);

  // Keyboard model from the board footers. Typing in a field never triggers a command.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const typing = isTypingTarget(e.target);
      const cmd = commandFor(e, view);
      if (!cmd) return;
      if (typing && cmd !== 'escape') return;
      const onControl = e.target instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName);
      if (cmd === 'accept' && onControl) return; // Enter activates the focused control instead
      const id = selectedItem?.id;
      const run: Record<InboxCommand, () => void> = {
        next: () => dispatch({ type: 'move', dir: 1 }),
        prev: () => dispatch({ type: 'move', dir: -1 }),
        takeOver: () => id && (id === 'figma' || id === 'brex') && dispatch({ type: 'takeOver', id }),
        handBack: () => id && dispatch({ type: 'handBack', id }),
        goToTab: () => undefined, // SEAM: focus the job's tab once the in-app browser exists (browserSeam.tsx)
        accept: () => id === 'figma' && accept(),
        edit: () => id === 'figma' && setEditing((v) => !v),
        skip: () => id === 'figma' && resolve('figma'),
        search: () => searchRef.current?.focus(),
        escape: () => {
          if (typing && e.target instanceof HTMLElement) e.target.blur();
          if (editing) setEditing(false);
          else if (!typing && view === 'pilot') dispatch({ type: 'move', dir: 1 });
        },
      };
      e.preventDefault();
      run[cmd]();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, selectedItem, editing, accept, resolve]);

  const reviewDraft: ReviewDraft = {
    title: FIGMA_QUESTION.title,
    wordLimit: FIGMA_QUESTION.wordLimit,
    text: draft,
    words,
    provenance: FIGMA_QUESTION.provenance,
    editing,
    onText: setDraft,
    onToggleEdit: () => setEditing((v) => !v),
    onAccept: accept,
    onSkip: () => resolve('figma'),
  };

  const driving = view === 'takeover';
  const rightWidth = selectedItem?.id === 'brex' ? 400 : 384;

  const center = () => {
    if (view === 'clear') {
      return <ClearCenter onDashboard={() => void navigate('/')} onAddJobs={() => undefined} />;
    }
    const id = state.selected!;
    const composer = (
      <Composer
        placeholder={
          id === 'cap'
            ? COMPOSER_PLACEHOLDER.cap
            : driving
              ? COMPOSER_PLACEHOLDER.driving(selectedItem!.agent)
              : COMPOSER_PLACEHOLDER.agent(selectedItem!.agent)
        }
        onSend={(text) => dispatch({ type: 'send', id, text })}
      />
    );
    const stream = (
      <MessageStream
        threadKey={`${id}:${driving}`}
        messages={threadMessages(state, id)}
        renderWidget={(m) =>
          m.kind === 'answer-review' ? (
            <ReviewWidget d={reviewDraft} />
          ) : (
            <ConsentWidget question={m.question} detail={m.detail} onAnswer={() => resolve('notion')} />
          )
        }
      />
    );
    const hasTab = selectedItem && (selectedItem.id === 'figma' || selectedItem.id === 'brex');
    const header =
      id === 'cap' ? (
        <ThreadHeader
          lead={<CapOnDartArt size={40} />}
          title="Cap"
          sub="Your pilot · reads your profile, rules and history every turn"
        >
          <span className="s" style={{ fontSize: 12.5 }}>
            Memory · 42 keys · 5 rules
          </span>
        </ThreadHeader>
      ) : (
        <ThreadHeader
          lead={<CritterBot agent={selectedItem!.agent} state={selectedItem!.critter} size={36} />}
          title={`${selectedItem!.agent} · ${selectedItem!.role}`}
          sub={selectedItem!.meta}
        >
          {driving ? (
            <>
              <button className="btn sm pri" type="button" aria-pressed="true">
                You’re driving
              </button>
              <button className="btn sm " type="button">
                Go to tab&nbsp;<KeyCap>G</KeyCap>
              </button>
            </>
          ) : (
            <>
              <button className="btn sm " type="button">
                Go to tab&nbsp;<KeyCap>G</KeyCap>
              </button>
              {hasTab && (
                <button
                  className="btn sm ghost"
                  type="button"
                  onClick={() => dispatch({ type: 'takeOver', id: selectedItem!.id })}
                  disabled={state.takeover !== null}
                >
                  Take over&nbsp;<KeyCap>T</KeyCap>
                </button>
              )}
            </>
          )}
        </ThreadHeader>
      );
    const thread = (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          background: 'var(--ground)',
        }}
      >
        {header}
        {stream}
        {composer}
      </section>
    );
    if (!driving) return thread;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          background: 'var(--ground)',
        }}
      >
        <ControlBanner agent={selectedItem!.agent} />
        {thread}
      </div>
    );
  };

  const right = () => {
    if (view === 'clear') return <UpNextPanel />;
    if (view === 'pilot') return <PilotPanel />;
    switch (selectedItem!.id) {
      case 'figma':
        return (
          <ReviewPanel words={words} editing={editing} onAccept={accept} onToggleEdit={() => setEditing((v) => !v)} />
        );
      case 'brex':
        return (
          <LiveTabPanel
            itemId="brex"
            agent="Brex"
            driving={driving}
            onHandBack={() => dispatch({ type: 'handBack', id: 'brex' })}
            onFinish={() => dispatch({ type: 'resolve', id: 'brex' })}
          />
        );
      case 'notion':
        return <ConsentPanel onAnswer={() => resolve('notion')} />;
    }
  };

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        className="inbox-grid"
        data-pane={pane}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `336px minmax(0,1fr) ${rightWidth}px`,
          gridTemplateRows: 'minmax(0,1fr)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <ThreadList
          ref={searchRef}
          items={visible}
          pendingCount={pending.length}
          selected={state.selected}
          takeover={state.takeover}
          query={query}
          onQuery={setQuery}
          onSelect={(id) => dispatch({ type: 'select', id })}
        />
        <div className="inbox-pane-tabs" role="group" aria-label="Inbox view">
          <button type="button" aria-pressed={pane === 'chat'} onClick={() => setPane('chat')}>
            Conversation
          </button>
          <button type="button" aria-pressed={pane === 'details'} onClick={() => setPane('details')}>
            {driving ? 'Live tab' : 'Details & review'}
          </button>
        </div>
        <div className="inbox-conversation">{center()}</div>
        <div className="inbox-details">{right()}</div>
      </div>
      <ShortcutBar shortcuts={SHORTCUTS_BY_VIEW[view]} />
    </div>
  );
}
