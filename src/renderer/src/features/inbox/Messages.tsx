import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReplyText } from '../../lib/chat-live';
import { createTextDrain } from '../../lib/text-drain';
import type { StepRow } from './model';
import type { ThreadMessage } from './threadMessage';
import { MONO, NEED_PILL, WIDGET } from './styles';

const STEP_DOT = {
  ok: 'bg-ink',
  now: 'bg-brand shadow-[0_0_0_4px_var(--brand-tint)]',
  wait: 'bg-need-dot',
} as const;

export const WIDGET_HEAD =
  'flex items-center justify-between border-b border-line px-[18px] py-3 text-[13px] text-muted';
export const WIDGET_FOOT = 'flex flex-wrap justify-end gap-2 border-t border-line bg-panel px-[18px] py-3';
export const WIDGET_TITLE = 'text-[17px] leading-[1.35] font-semibold tracking-[-0.01em]';
export const ACTIVE_WIDGET = `${WIDGET} outline-2 outline-offset-[3px] outline-ink`;

const BUBBLE_BASE = 'rounded-[20px] px-4 py-3 text-[15px] leading-[1.5] border border-line bg-bg';
const BUBBLE = `max-w-[78%] self-start rounded-bl-[6px] ${BUBBLE_BASE}`;

export type { ThreadMessage };

/** Amber head of a question / review widget. */
export function WidgetPill({ children }: { children: ReactNode }) {
  return <span className={NEED_PILL}>{children}</span>;
}

function Steps({ title, rows }: { title: string; rows: readonly StepRow[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-[78%] self-start rounded-2xl border border-line bg-bg px-3.5 py-1.5">
      <button
        type="button"
        className="flex min-h-10 w-full items-center justify-between border-0 bg-transparent p-0 text-left text-[13.5px]! font-semibold! text-ink-2!"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{title}</span>
        <span className="text-[13.5px] text-muted">&rsaquo;</span>
      </button>
      {open &&
        rows.map((r) => (
          <div
            key={r.label}
            className="grid min-h-[30px] grid-cols-[18px_1fr_auto] items-center gap-2.5 text-[13.5px] text-ink-2"
          >
            <i className={`size-2 justify-self-center rounded-full ${STEP_DOT[r.tone]}`}></i>
            <span>{r.label}</span>
            <code className="font-mono text-[12px] text-muted">{r.meta}</code>
          </div>
        ))}
    </div>
  );
}

/** The text of the reply being written: it reveals itself on animation frames and writes the DOM directly, so nothing else re-renders per token. */
function LiveText({ chatKey }: { chatKey: string }) {
  const target = useReplyText(chatKey);
  const node = useRef<HTMLSpanElement>(null);
  const drain = useRef<ReturnType<typeof createTextDrain>>(undefined);
  useEffect(() => {
    drain.current = createTextDrain({
      write: (shown) => {
        if (node.current) node.current.textContent = shown;
      },
      reduced: reducedMotion(),
    });
    return () => drain.current?.flush();
  }, []);
  useEffect(() => drain.current?.update(target), [target]);
  return <span ref={node}></span>;
}

type BubbleMessage = Extract<ThreadMessage, { kind: 'bubble' }>;

const sameBubble = ({ m: a }: { m: BubbleMessage }, { m: b }: { m: BubbleMessage }) =>
  a.text === b.text &&
  a.mine === b.mine &&
  a.status === b.status &&
  a.error === b.error &&
  a.streaming === b.streaming &&
  a.liveKey === b.liveKey;

/** Finished bubbles are memoised: a streamed token never re-renders them. */
const Bubble = memo(function Bubble({ m }: { m: BubbleMessage }) {
  return (
    <div className={m.mine ? 'flex max-w-[78%] flex-col items-end gap-1 self-end' : 'contents'}>
      <div
        className={
          m.mine
            ? `${BUBBLE_BASE} rounded-br-[6px]! border-0! bg-panel! whitespace-pre-wrap ${m.status === 'sending' ? 'opacity-60' : ''}`
            : `${BUBBLE} whitespace-pre-wrap`
        }
        aria-live={m.streaming ? 'off' : undefined}
      >
        {m.streaming && m.liveKey ? <LiveText chatKey={m.liveKey} /> : m.text}
        {m.streaming ? (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse bg-ink"
          ></span>
        ) : null}
      </div>
      {m.status === 'failed' ? (
        <div role="alert" className="flex items-center gap-2 text-[12.5px] text-bad">
          <span>{m.error ?? 'Not sent.'}</span>
          {m.onRetry ? (
            <button
              type="button"
              className="min-h-7 rounded-full border border-line-2 bg-bg px-2.5 text-[12.5px] font-semibold text-ink"
              onClick={m.onRetry}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}, sameBubble);

function renderMessage(m: ThreadMessage, i: number): ReactNode {
  switch (m.kind) {
    case 'day':
      return (
        <span key={i} className={`self-center ${MONO} text-[11px]`}>
          {m.label}
        </span>
      );
    case 'steps':
      return <Steps key={i} title={m.title} rows={m.rows} />;
    case 'bubble':
      return <Bubble key={i} m={m} />;
    case 'typing':
      return (
        <div
          key={i}
          role="status"
          aria-label="The agent is replying"
          className={`${BUBBLE} flex items-center gap-1.5 py-3.5`}
        >
          {[0, 150, 300].map((delay) => (
            <i
              key={delay}
              aria-hidden="true"
              style={{ animationDelay: `${delay}ms` }}
              className="size-[7px] animate-bounce rounded-full bg-muted"
            ></i>
          ))}
        </div>
      );
    case 'note':
      return (
        <span key={i} className="flex items-center gap-2 self-start pl-1 text-[12.5px] text-muted">
          <span>✓ {m.text}</span>
          {m.onUndo ? (
            <button
              type="button"
              className="min-h-7 rounded-full border border-line-2 bg-bg px-2.5 text-[12.5px] font-semibold text-ink"
              onClick={m.onUndo}
            >
              Undo
            </button>
          ) : null}
        </span>
      );
    case 'widget':
      return <div key={i}>{m.node}</div>;
  }
}

const NEAR_BOTTOM_PX = 96;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The thread's messages, bottom-anchored like the boards (newest at the bottom). It follows new content only while the
 * owner is at the bottom: scrolling up to read stops the following, and sending (or switching threads) jumps back.
 * Growth of the streaming bubble is followed with an instant scroll from a ResizeObserver (no per-token measuring, no
 * animation to fight the text); only a new message scrolls smoothly. `busy` marks a reply in flight so assistive tech
 * waits for it to finish instead of reading every token.
 */
export function MessageStream({
  messages,
  threadKey,
  busy = false,
}: {
  messages: readonly ThreadMessage[];
  threadKey: string;
  busy?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const lastThread = useRef(threadKey);
  const lastOwn = useRef(0);
  const lastCount = useRef(0);
  const ownCount = messages.filter((m) => m.kind === 'bubble' && m.mine).length;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const switched = lastThread.current !== threadKey;
    const sent = ownCount > lastOwn.current;
    const added = messages.length > lastCount.current;
    lastThread.current = threadKey;
    lastOwn.current = ownCount;
    lastCount.current = messages.length;
    if (switched || sent) following.current = true;
    if (!following.current || (!switched && !added)) return;
    const frame = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: switched || busy || reducedMotion() ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [threadKey, messages.length, ownCount, busy]);

  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (following.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={scroller}
      className="mx-auto flex w-full max-w-[820px] min-h-0 flex-1 flex-col overflow-y-auto px-12 py-6"
      role="log"
      aria-live="polite"
      aria-busy={busy}
      aria-label="Thread"
      onScroll={(e) => {
        const el = e.currentTarget;
        following.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
    >
      <div ref={content} className="mt-auto flex flex-col gap-3.5 *:flex-none">
        {messages.map((m, i) => renderMessage(m, i))}
      </div>
    </div>
  );
}
