import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyCap } from '../../components/KeyCap';
import { MonoLabel } from '../../components/MonoLabel';
import type { MessageAction, ThreadMessage } from './model';

function Steps({ title, rows }: { title: string; rows: Extract<ThreadMessage, { kind: 'steps' }>['rows'] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="self-start w-[78%] [border:1px_solid_var(--line)] rounded-[16px] bg-bg p-[6px_14px]">
      <button
        type="button"
        className="flex justify-between items-center min-h-[40px] text-[13.5px]! font-[600]! text-ink-2! w-[100%] [background:none] [border:0] p-[0px] text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        
      >
        <span>{title}</span>
        <span className="text-[13.5px] text-muted">&rsaquo;</span>
      </button>
      {open &&
        rows.map((r) => (
          <div key={r.label} className={`stp ${r.tone}`}>
            <i></i>
            <span>{r.label}</span>
            <code>{r.meta}</code>
          </div>
        ))}
    </div>
  );
}

function ActionButtons({ actions }: { actions: readonly MessageAction[] }) {
  return (
    <div className="flex items-center gap-[8px] flex-nowrap mt-[12px]" >
      {actions.map((a) => (
        <button key={a.label} className={a.variant === 'plain' ? 'btn sm ' : `btn sm ${a.variant}`} type="button">
          {a.label}
        </button>
      ))}
    </div>
  );
}

function WidgetHead({ head }: { head: [string, string] }) {
  return (
    <div className="flex justify-between items-center p-[12px_18px] [border-bottom:1px_solid_var(--line)] text-[13px] text-muted">
      <span>{head[0]}</span>
      <span>{head[1]}</span>
    </div>
  );
}

function Brief({ head, stats }: Extract<ThreadMessage, { kind: 'brief' }>) {
  return (
    <div className="self-start w-[100%] bg-bg [border:1px_solid_var(--line)] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/.04)]" >
      <WidgetHead head={head} />
      <div className="p-[18px] grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[18px]" >
        {stats.map((s) => (
          <div key={s.title} className="flex flex-col gap-[4px] min-w-[0px]">
            <div className="font-serif text-[52px] leading-[1] tracking-[-.02em]">
              {s.value}
            </div>
            <div className="font-[600] text-[14.5px]">{s.title}</div>
            <div className="text-[12.5px] text-muted leading-[1.4]" >
              {s.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({ head, rows }: Extract<ThreadMessage, { kind: 'bars' }>) {
  return (
    <div className="self-start w-[100%] bg-bg [border:1px_solid_var(--line)] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/.04)]" >
      <WidgetHead head={head} />
      <div className="p-[14px_18px] flex flex-col gap-[11px]" >
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-[12px] flex-nowrap text-[13px]" >
            <span className="w-[88px] flex-none">{r.label}</span>
            <div className="flex-1 h-[8px] rounded-[9px] bg-line overflow-hidden">
              <div style={{ height: 8, width: `${r.pct}%`, borderRadius: 9, background: 'var(--brand)' }}></div>
            </div>
            <span
              className="text-[12px] text-muted w-[98px] text-right flex-none tabular-nums"
              
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Evidence({ head, rows }: Extract<ThreadMessage, { kind: 'evidence' }>) {
  return (
    <div className="self-start w-[100%] bg-bg [border:1px_solid_var(--line)] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/.04)]" >
      <WidgetHead head={head} />
      <div className="p-[2px_18px_6px]" >
        {rows.map((r) => (
          <div
            key={r.source}
            className="flex items-start gap-[14px] flex-nowrap p-[10px_0] [border-top:1px_solid_var(--line)]"
            
          >
            <MonoLabel className="w-[112px] flex-none">{r.source}</MonoLabel>
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
    <div className="self-start w-[100%] bg-bg [border:1px_solid_var(--line)] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/.04)] [outline:2px_solid_var(--ink)] [outline-offset:3px]" >
      <div className="flex justify-between items-center p-[12px_18px] [border-bottom:1px_solid_var(--line)] text-[13px] text-muted">
        <span className="st need">Consent · required</span>
        <span>Your call</span>
      </div>
      <div className="p-[18px]">
        <div className="font-[600] text-[17px] leading-[1.35] tracking-[-.01em]">{question}</div>
        <div className="text-[12.5px] text-muted mt-[8px]" >
          {detail}
        </div>
      </div>
      <div className="flex justify-end gap-[8px] p-[12px_18px] [border-top:1px_solid_var(--line)] bg-panel">
        <button className="btn sm ghost" type="button" onClick={() => onAnswer(false)}>
          Don’t allow
        </button>
        <button className="btn sm pri" type="button" onClick={() => onAnswer(true)}>
          Allow
        </button>
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
    <div className="self-start w-[100%] bg-bg [border:1px_solid_var(--line)] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/.04)] [outline:2px_solid_var(--ink)] [outline-offset:3px]" >
      <div className="flex justify-between items-center p-[12px_18px] [border-bottom:1px_solid_var(--line)] text-[13px] text-muted">
        <span className="st need">Question 1 of 1 · required</span>
        <span>{d.wordLimit} words max</span>
      </div>
      <div className="p-[18px]">
        <div className="font-[600] text-[17px] leading-[1.35] tracking-[-.01em]">{d.title}</div>
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${over ? 'var(--bad)' : 'var(--ink)'}`,
            borderRadius: 14,
            padding: '14px 16px',
            fontSize: 14.5,
            lineHeight: 1.6,
            color: 'var(--ink-2)',
            background: 'var(--bg)',
          }}
        >
          {d.editing ? (
            <textarea
              ref={areaRef}
              className="block w-[100%] resize-none [font:inherit] [outline:0] bg-transparent [color:inherit] [border:0] p-[0px] leading-[inherit] focus-visible:outline-none!"
              rows={7}
              value={d.text}
              aria-label={`Answer: ${d.title}`}
              aria-invalid={over}
              onChange={(e) => d.onText(e.target.value)}
              
            />
          ) : (
            <>
              {d.text}
              <span className="inline-block w-[2px] h-[1.05em] ml-[2px] align-[-.18em] bg-ink animate-[v17Caret_1s_steps(1)_infinite]"></span>
            </>
          )}
        </div>
        <div className="flex items-center gap-[12px] flex-nowrap justify-between mt-[9px]" >
          <span className="s" style={{ fontSize: 12.5, color: over ? 'var(--bad)' : undefined }}>
            Cap’s draft · {d.words} / {d.wordLimit} words
          </span>
          <span className="text-[12.5px] text-muted" >
            {d.provenance}
          </span>
        </div>
      </div>
      <div className="flex justify-end gap-[8px] p-[12px_18px] [border-top:1px_solid_var(--line)] bg-panel">
        <button className="btn sm ghost" type="button" onClick={d.onSkip}>
          Skip&nbsp;<KeyCap>S</KeyCap>
        </button>
        <button className="btn sm " type="button" onClick={d.onToggleEdit}>
          {d.editing ? 'Done' : 'Edit'}&nbsp;<KeyCap>E</KeyCap>
        </button>
        <button className="btn sm pri" type="button" onClick={d.onAccept} disabled={over || d.words === 0}>
          Accept&nbsp;<KeyCap>↵</KeyCap>
        </button>
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
        <span key={i} className="self-center font-mono text-[11px] tracking-[.08em] uppercase text-muted">
          {m.label}
        </span>
      );
    case 'steps':
      return <Steps key={i} title={m.title} rows={m.rows} />;
    case 'bubble':
      return (
        <div key={i} className={`bub ${m.side}`}>
          {m.text}
          {m.actions && <ActionButtons actions={m.actions} />}
        </div>
      );
    case 'event':
      return (
        <div key={i} className="self-center inline-flex gap-[8px] items-center text-[13px] text-muted p-[6px_12px] rounded-[99px] bg-panel [&_b]:text-ink [&_b]:font-semibold">
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
    <div ref={ref} className="flex-1 overflow-hidden p-[24px_48px] flex flex-col gap-[14px] max-w-[820px] w-[100%] m-[0_auto] overflow-y-auto [mask-image:linear-gradient(to_bottom,_transparent,_rgb(0_0_0)_36px)] [&>*]:flex-none before:mt-auto before:content-['']" role="log" aria-label="Thread">
      {messages.map((m, i) => renderMessage(m, i, props))}
    </div>
  );
}
