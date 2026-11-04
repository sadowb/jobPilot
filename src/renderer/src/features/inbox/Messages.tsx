import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { StepRow } from './model';
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

const BUBBLE =
  'max-w-[78%] rounded-[20px] px-4 py-3 text-[15px] leading-[1.5] self-start rounded-bl-[6px] border border-line bg-bg';

export type ThreadMessage =
  | { kind: 'day'; label: string }
  | { kind: 'steps'; title: string; rows: readonly StepRow[] }
  | { kind: 'bubble'; text: string; mine?: boolean }
  /** An interactive widget card owned by the page. */
  | { kind: 'widget'; node: ReactNode };

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
      return (
        <div
          key={i}
          className={m.mine ? `${BUBBLE} self-end! rounded-bl-[20px]! rounded-br-[6px]! border-0! bg-panel!` : BUBBLE}
        >
          {m.text}
        </div>
      );
    case 'widget':
      return <div key={i}>{m.node}</div>;
  }
}

/** The thread's messages, bottom-anchored like the boards (newest at the bottom). New messages are announced politely. */
export function MessageStream({ messages, threadKey }: { messages: readonly ThreadMessage[]; threadKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threadKey, messages.length]);
  return (
    <div
      ref={ref}
      className="mx-auto flex w-full max-w-[820px] min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-12 py-6 before:mt-auto *:flex-none"
      role="log"
      aria-live="polite"
      aria-label="Thread"
    >
      {messages.map((m, i) => renderMessage(m, i))}
    </div>
  );
}
