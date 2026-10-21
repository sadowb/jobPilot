import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyCap } from '../../components/KeyCap';
import { MonoLabel } from '../../components/MonoLabel';
import type { MessageAction, ThreadMessage } from './model';

function Steps({ title, rows }: { title: string; rows: Extract<ThreadMessage, { kind: 'steps' }>['rows'] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="steps">
      <button
        type="button"
        className="sh"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left' }}
      >
        <span>{title}</span>
        <span className="s">&rsaquo;</span>
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
    <div className="row nw" style={{ gap: 8, marginTop: 12 }}>
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
    <div className="wh">
      <span>{head[0]}</span>
      <span>{head[1]}</span>
    </div>
  );
}

function Brief({ head, stats }: Extract<ThreadMessage, { kind: 'brief' }>) {
  return (
    <div className="wid" style={{ width: '100%' }}>
      <WidgetHead head={head} />
      <div className="wb2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 18 }}>
        {stats.map((s) => (
          <div key={s.title} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 52, lineHeight: 1, letterSpacing: '-.02em' }}>
              {s.value}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.title}</div>
            <div className="s" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
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
    <div className="wid" style={{ width: '100%' }}>
      <WidgetHead head={head} />
      <div className="wb2" style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '14px 18px' }}>
        {rows.map((r) => (
          <div key={r.label} className="row nw" style={{ gap: 12, fontSize: 13 }}>
            <span style={{ width: 88, flex: 'none' }}>{r.label}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 9, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ height: 8, width: `${r.pct}%`, borderRadius: 9, background: 'var(--brand)' }}></div>
            </div>
            <span
              className="s"
              style={{ width: 98, textAlign: 'right', fontSize: 12, flex: 'none', fontVariantNumeric: 'tabular-nums' }}
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
    <div className="wid" style={{ width: '100%' }}>
      <WidgetHead head={head} />
      <div className="wb2" style={{ padding: '2px 18px 6px' }}>
        {rows.map((r) => (
          <div
            key={r.source}
            className="row nw"
            style={{ gap: 14, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--line)' }}
          >
            <MonoLabel style={{ width: 112, flex: 'none' }}>{r.source}</MonoLabel>
            <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{r.text}</span>
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
    <div className="wid" style={{ width: '100%', outline: '2px solid var(--ink)', outlineOffset: 3 }}>
      <div className="wh">
        <span className="st need">Consent · required</span>
        <span>Your call</span>
      </div>
      <div className="wb2">
        <div style={{ fontWeight: 600, fontSize: 17, lineHeight: 1.35, letterSpacing: '-.01em' }}>{question}</div>
        <div className="s" style={{ fontSize: 12.5, marginTop: 8 }}>
          {detail}
        </div>
      </div>
      <div className="wf">
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
    <div className="wid" style={{ width: '100%', outline: '2px solid var(--ink)', outlineOffset: 3 }}>
      <div className="wh">
        <span className="st need">Question 1 of 1 · required</span>
        <span>{d.wordLimit} words max</span>
      </div>
      <div className="wb2">
        <div style={{ fontWeight: 600, fontSize: 17, lineHeight: 1.35, letterSpacing: '-.01em' }}>{d.title}</div>
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
              className="jp-inbox-draft"
              rows={7}
              value={d.text}
              aria-label={`Answer: ${d.title}`}
              aria-invalid={over}
              onChange={(e) => d.onText(e.target.value)}
              style={{ background: 'transparent', color: 'inherit', border: 0, padding: 0, lineHeight: 'inherit' }}
            />
          ) : (
            <>
              {d.text}
              <span className="v17caret"></span>
            </>
          )}
        </div>
        <div className="row sp nw" style={{ marginTop: 9 }}>
          <span className="s" style={{ fontSize: 12.5, color: over ? 'var(--bad)' : undefined }}>
            Cap’s draft · {d.words} / {d.wordLimit} words
          </span>
          <span className="s" style={{ fontSize: 12.5 }}>
            {d.provenance}
          </span>
        </div>
      </div>
      <div className="wf">
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
        <span key={i} className="day">
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
        <div key={i} className="evt">
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
    <div ref={ref} className="msgs v17msgs" role="log" aria-label="Thread">
      {messages.map((m, i) => renderMessage(m, i, props))}
    </div>
  );
}
