import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyCap } from '../../components/KeyCap';
import { Btn } from './Btn';
import type { MessageAction, ThreadMessage } from './model';
import { MONO, NEED_PILL, WIDGET } from './styles';

const STEP_DOT = {
  ok: 'bg-ink',
  now: 'bg-brand shadow-[0_0_0_4px_var(--brand-tint)]',
  wait: 'bg-need-dot',
} as const;

const WIDGET_HEAD = 'flex items-center justify-between border-b border-line px-[18px] py-3 text-[13px] text-muted';
const WIDGET_FOOT = 'flex justify-end gap-2 border-t border-line bg-panel px-[18px] py-3';
const WIDGET_TITLE = 'text-[17px] leading-[1.35] font-semibold tracking-[-0.01em]';
const ACTIVE_WIDGET = `${WIDGET} outline-2 outline-offset-[3px] outline-ink`;

const BUBBLE = 'max-w-[78%] rounded-[20px] px-4 py-3 text-[15px] leading-[1.5]';
const BUBBLE_SIDE = {
  a: 'self-start rounded-bl-[6px] border border-line bg-bg',
  u: 'self-end rounded-br-[6px] bg-pri text-on-pri',
} as const;

const ACTION_VARIANT = { pri: 'primary', plain: 'default', ghost: 'ghost' } as const;

function Steps({ title, rows }: { title: string; rows: Extract<ThreadMessage, { kind: 'steps' }>['rows'] }) {
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

function ActionButtons({ actions }: { actions: readonly MessageAction[] }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      {actions.map((a) => (
        <Btn key={a.label} size="sm" variant={ACTION_VARIANT[a.variant]}>
          {a.label}
        </Btn>
      ))}
    </div>
  );
}

function WidgetHead({ head }: { head: [string, string] }) {
  return (
    <div className={WIDGET_HEAD}>
      <span>{head[0]}</span>
      <span>{head[1]}</span>
    </div>
  );
}

function Brief({ head, stats }: Extract<ThreadMessage, { kind: 'brief' }>) {
  return (
    <div className={WIDGET}>
      <WidgetHead head={head} />
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[18px] p-[18px]">
        {stats.map((s) => (
          <div key={s.title} className="flex min-w-0 flex-col gap-1">
            <div className="font-serif text-[52px] leading-none tracking-[-0.02em]">{s.value}</div>
            <div className="text-[14.5px] font-semibold">{s.title}</div>
            <div className="text-[12.5px] leading-[1.4] text-muted">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({ head, rows }: Extract<ThreadMessage, { kind: 'bars' }>) {
  return (
    <div className={WIDGET}>
      <WidgetHead head={head} />
      <div className="flex flex-col gap-[11px] px-[18px] py-3.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 text-[13px]">
            <span className="w-[88px] flex-none">{r.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-[9px] bg-line">
              <div className="h-2 rounded-[9px] bg-brand" style={{ width: `${r.pct}%` }}></div>
            </div>
            <span className="w-[98px] flex-none text-right text-[12px] text-muted tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Evidence({ head, rows }: Extract<ThreadMessage, { kind: 'evidence' }>) {
  return (
    <div className={WIDGET}>
      <WidgetHead head={head} />
      <div className="px-[18px] pt-0.5 pb-1.5">
        {rows.map((r) => (
          <div key={r.source} className="flex items-start gap-3.5 border-t border-line py-2.5">
            <span className={`${MONO} w-28 flex-none text-muted`}>{r.source}</span>
            <span className="text-[13.5px] leading-[1.5]">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsentWidget({
  question,
  detail,
  onAnswer,
}: {
  question: string;
  detail: string;
  onAnswer: (allow: boolean) => void;
}) {
  return (
    <div className={ACTIVE_WIDGET}>
      <div className={WIDGET_HEAD}>
        <span className={NEED_PILL}>Consent · required</span>
        <span>Your call</span>
      </div>
      <div className="p-[18px]">
        <div className={WIDGET_TITLE}>{question}</div>
        <div className="mt-2 text-[12.5px] text-muted">{detail}</div>
      </div>
      <div className={WIDGET_FOOT}>
        <Btn size="sm" variant="ghost" onClick={() => onAnswer(false)}>
          Don’t allow
        </Btn>
        <Btn size="sm" variant="primary" onClick={() => onAnswer(true)}>
          Allow
        </Btn>
      </div>
    </div>
  );
}

/** Interactive state for the pending "Why Figma?" draft (see ReviewWidget). */
export interface ReviewDraft {
  title: string;
  wordLimit: number;
  text: string;
  words: number;
  provenance: string;
  editing: boolean;
  onText: (text: string) => void;
  onToggleEdit: () => void;
  onAccept: () => void;
  onSkip: () => void;
}

export function ReviewWidget({ d }: { d: ReviewDraft }) {
  const over = d.words > d.wordLimit;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (d.editing) areaRef.current?.focus();
  }, [d.editing]);
  return (
    <div className={ACTIVE_WIDGET}>
      <div className={WIDGET_HEAD}>
        <span className={NEED_PILL}>Question 1 of 1 · required</span>
        <span>{d.wordLimit} words max</span>
      </div>
      <div className="p-[18px]">
        <div className={WIDGET_TITLE}>{d.title}</div>
        <div
          className={`mt-3 rounded-[14px] border bg-bg px-4 py-3.5 text-[14.5px] leading-[1.6] text-ink-2 ${over ? 'border-bad' : 'border-ink'}`}
        >
          {d.editing ? (
            <textarea
              ref={areaRef}
              className="block w-full resize-none border-0 bg-transparent p-0 leading-[inherit] text-inherit outline-none!"
              rows={7}
              value={d.text}
              aria-label={`Answer: ${d.title}`}
              aria-invalid={over}
              onChange={(e) => d.onText(e.target.value)}
            />
          ) : (
            <>
              {d.text}
              <span className="ml-0.5 inline-block h-[1.05em] w-0.5 animate-jp-caret bg-ink align-[-0.18em]"></span>
            </>
          )}
        </div>
        <div className="mt-[9px] flex items-center justify-between gap-3">
          <span className={`text-[12.5px] ${over ? 'text-bad' : 'text-muted'}`}>
            Cap’s draft · {d.words} / {d.wordLimit} words
          </span>
          <span className="text-[12.5px] text-muted">{d.provenance}</span>
        </div>
      </div>
      <div className={WIDGET_FOOT}>
        <Btn size="sm" variant="ghost" onClick={d.onSkip}>
          Skip&nbsp;<KeyCap>S</KeyCap>
        </Btn>
        <Btn size="sm" onClick={d.onToggleEdit}>
          {d.editing ? 'Done' : 'Edit'}&nbsp;<KeyCap>E</KeyCap>
        </Btn>
        <Btn size="sm" variant="primary" onClick={d.onAccept} disabled={over || d.words === 0}>
          Accept&nbsp;<KeyCap>↵</KeyCap>
        </Btn>
      </div>
    </div>
  );
}

export interface MessageStreamProps {
  messages: readonly ThreadMessage[];
  /** Resolves the interactive widgets that live in the page. */
  renderWidget: (m: Extract<ThreadMessage, { kind: 'answer-review' | 'consent' }>) => ReactNode;
  /** Changes when a different thread is shown, so the stream scrolls to its newest message. */
  threadKey: string;
}

function renderMessage(m: ThreadMessage, i: number, props: MessageStreamProps): ReactNode {
  switch (m.kind) {
    case 'day':
      return (
        <span key={i} className="self-center font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
          {m.label}
        </span>
      );
    case 'steps':
      return <Steps key={i} title={m.title} rows={m.rows} />;
    case 'bubble':
      return (
        <div key={i} className={`${BUBBLE} ${BUBBLE_SIDE[m.side]}`}>
          {m.text}
          {m.actions && <ActionButtons actions={m.actions} />}
        </div>
      );
    case 'event':
      return (
        <div
          key={i}
          className="inline-flex items-center gap-2 self-center rounded-full bg-panel px-3 py-1.5 text-[13px] text-muted"
        >
          {m.text}
        </div>
      );
    case 'brief':
      return <Brief key={i} {...m} />;
    case 'bars':
      return <Bars key={i} {...m} />;
    case 'evidence':
      return <Evidence key={i} {...m} />;
    case 'answer-review':
    case 'consent':
      return <Fragment key={i}>{props.renderWidget(m)}</Fragment>;
  }
}

/** The thread's messages, bottom-anchored like the boards (newest at the bottom). */
export function MessageStream(props: MessageStreamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { threadKey, messages } = props;
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threadKey, messages.length]);
  return (
    <div
      ref={ref}
      className="mx-auto flex w-full max-w-[820px] flex-1 flex-col gap-3.5 overflow-hidden mask-[linear-gradient(to_bottom,transparent,rgb(0_0_0)_36px)] px-12 py-6 before:mt-auto *:flex-none"
      role="log"
      aria-label="Thread"
    >
      {messages.map((m, i) => renderMessage(m, i, props))}
    </div>
  );
}
