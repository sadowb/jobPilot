import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { CritterBot } from '../../components/CritterBot';
import { KeyCap } from '../../components/KeyCap';
import { MonoLabel } from '../../components/MonoLabel';
import { SAMPLE_JOBS, STATUS_CHIP, type JobRecord } from './jobs';
import {
  answerFor,
  buildResults,
  flatten,
  moveIndex,
  type Answer,
  type CommandIntent,
  type CommandResult,
} from './search';

const ICONS = {
  search: <path d="M20 20l-4-4" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
} as const;

function Icon({ size, children, style }: { size: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {children}
    </svg>
  );
}

const ELLIPSIS: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

function StatusChip({ status }: { status: JobRecord['status'] }) {
  const c = STATUS_CHIP[status];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 600,
        color: c.color,
        background: c.background,
        borderRadius: 99,
        padding: '3px 10px',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

function ResultRow({
  result,
  job,
  selected,
  domId,
  onHover,
  onRun,
}: {
  result: CommandResult;
  job: JobRecord | undefined;
  selected: boolean;
  domId: string;
  onHover: () => void;
  onRun: () => void;
}) {
  const lead =
    result.kind === 'job' && job ? (
      <CritterBot agent={job.company} state={job.critter} size={34} />
    ) : result.kind === 'ask' ? (
      <CapOnDartArt size={34} />
    ) : (
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'var(--panel)',
          display: 'grid',
          placeItems: 'center',
          flex: 'none',
        }}
      >
        <Icon size={16}>{result.intent.type === 'open-posting' ? ICONS.external : ICONS.arrow}</Icon>
      </span>
    );
  return (
    <div
      id={domId}
      role="option"
      aria-selected={selected}
      className="row nw"
      onMouseEnter={onHover}
      onClick={onRun}
      style={{
        gap: 12,
        padding: '10px 12px',
        borderRadius: 12,
        minWidth: 0,
        cursor: 'pointer',
        ...(selected ? { background: 'var(--panel)', boxShadow: 'inset 3px 0 0 var(--ink)' } : null),
      }}
    >
      {lead}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5, ...ELLIPSIS }}>{result.title}</div>
        <div className="s" style={{ fontSize: 12.5, ...ELLIPSIS }}>
          {result.subtitle}
        </div>
      </div>
      {result.kind === 'job' && job ? (
        <StatusChip status={job.status} />
      ) : (
        result.hint && <KeyCap>{result.hint}</KeyCap>
      )}
    </div>
  );
}

function Hint({ keys, children }: { keys: string; children: ReactNode }) {
  return (
    <span className="row nw" style={{ gap: 6 }}>
      <KeyCap>{keys}</KeyCap>
      {children}
    </span>
  );
}

function AnswerPane({
  answer,
  onOpenInbox,
  onRun,
}: {
  answer: Answer | null;
  onOpenInbox: () => void;
  onRun: (intent: CommandIntent) => void;
}) {
  return (
    <>
      <div style={{ padding: '18px 18px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row nw" style={{ gap: 10 }}>
          <CapOnDartArt size={34} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Cap</div>
            <div className="s" style={{ fontSize: 12.5 }}>
              {answer ? answer.meta : 'answer · nothing to read for this yet'}
            </div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          {answer
            ? answer.intro
            : 'I can’t answer that in this build yet. Status changes work, for example “set ramp to interview”.'}
        </p>
        {answer && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {answer.rows.map((r) => (
              <div
                key={r.label}
                className="row nw"
                style={{ gap: 14, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}
              >
                <MonoLabel style={{ width: 92, flex: 'none', paddingTop: 3 }}>{r.label}</MonoLabel>
                <span style={{ fontSize: 14, lineHeight: 1.5 }}>{r.text}</span>
              </div>
            ))}
          </div>
        )}
        {answer && (
          <p className="s" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>
            {answer.note}
          </p>
        )}
      </div>
      <div
        className="row sp nw"
        style={{ gap: 10, padding: '12px 18px', borderTop: '1px solid var(--line)', background: 'var(--panel)' }}
      >
        <span className="row nw s" style={{ gap: 6, fontSize: 12 }}>
          <KeyCap>Esc</KeyCap>close
        </span>
        <div className="row nw" style={{ gap: 8 }}>
          <button className="btn sm " type="button" onClick={onOpenInbox}>
            Open in Inbox&nbsp;<KeyCap>⌘↵</KeyCap>
          </button>
          {answer?.primary && (
            <button className="btn sm pri" type="button" onClick={() => onRun(answer.primary!.intent)}>
              {answer.primary.label}&nbsp;<KeyCap>↵</KeyCap>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export interface CommandBoxProps {
  jobs?: readonly JobRecord[];
  initialQuery?: string;
  /** Called with the chosen intent; the box closes after. UI-only until the API exists. */
  onRun?: (intent: CommandIntent) => void;
  /** ⌘↵: continue the query in Inbox (the pilot thread). */
  onOpenInInbox?: (query: string) => void;
  onClose: () => void;
}

/** The ⌘K command box: results (V17_CmdK) and the inline answer (V17_CmdK_Answer). Render only while open. */
export function CommandBox({ jobs = SAMPLE_JOBS, initialQuery = '', onRun, onOpenInInbox, onClose }: CommandBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<'results' | 'answer'>('results');
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const sections = useMemo(() => buildResults(query, jobs), [query, jobs]);
  const flat = useMemo(() => flatten(sections), [sections]);
  const answer = useMemo(() => (mode === 'answer' ? answerFor(query, jobs) : null), [mode, query, jobs]);
  const current = flat[Math.min(selected, flat.length - 1)];
  const jobOf = (id?: string) => jobs.find((j) => j.id === id);

  useEffect(() => inputRef.current?.focus(), []);

  const run = (intent: CommandIntent) => {
    if (intent.type === 'ask') return setMode('answer');
    onRun?.(intent);
    onClose();
  };
  const openInInbox = () => {
    onOpenInInbox?.(query.trim());
    onClose();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        return onClose();
      case 'Tab':
        e.preventDefault(); // focus stays in the box; ⇥ asks Cap
        if (!e.shiftKey && query.trim()) setMode('answer');
        return;
      case 'ArrowDown':
      case 'ArrowUp':
        if (mode !== 'results') return;
        e.preventDefault();
        return setSelected((i) => moveIndex(i, e.key === 'ArrowDown' ? 1 : -1, flat.length));
      case 'Enter':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          return openInInbox();
        }
        e.preventDefault();
        if (mode === 'answer') return answer?.primary && run(answer.primary.intent);
        return current && run(current.intent);
    }
  };

  const width = mode === 'answer' ? 680 : 640;
  const offsets = sections.map((_, i) => sections.slice(0, i).reduce((n, s) => n + s.results.length, 0));

  return (
    <>
      <div className="scrim" style={{ position: 'fixed', zIndex: 5 }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask Cap"
        onKeyDown={onKeyDown}
        style={{
          position: 'fixed',
          left: '50%',
          top: 96,
          transform: 'translateX(-50%)',
          width,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 128px)',
          overflowY: 'auto',
          zIndex: 10,
          background: 'var(--bg)',
          border: '1px solid var(--line-2)',
          borderRadius: 20,
          boxShadow: 'var(--float)',
          overflowX: 'hidden',
        }}
      >
        <div className="row nw" style={{ gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
          <Icon size={18} style={{ flex: 'none', color: 'var(--muted)' }}>
            <circle cx="11" cy="11" r="7" />
            {ICONS.search}
          </Icon>
          <input
            ref={inputRef}
            className="jp-cmdk-input"
            role="combobox"
            aria-expanded={mode === 'results'}
            aria-controls={listId}
            aria-activedescendant={mode === 'results' && current ? `${listId}-${current.id}` : undefined}
            aria-label="Ask Cap or search jobs"
            placeholder="Ask Cap or search jobs"
            value={query}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
              setMode('results');
            }}
          />
          <KeyCap>Esc</KeyCap>
        </div>
        {mode === 'results' ? (
          <>
            <div id={listId} role="listbox" aria-label="Results">
              {sections.map((s, si) => (
                <div key={s.label} role="group" aria-label={s.label} style={{ padding: '6px 8px 4px' }}>
                  <MonoLabel style={{ padding: '6px 10px 4px', display: 'block' }}>{s.label}</MonoLabel>
                  {s.results.map((r, ri) => {
                    const at = offsets[si]! + ri;
                    return (
                      <ResultRow
                        key={r.id}
                        result={r}
                        job={jobOf(r.jobId)}
                        selected={at === selected}
                        domId={`${listId}-${r.id}`}
                        onHover={() => setSelected(at)}
                        onRun={() => run(r.intent)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              className="row nw s"
              style={{
                gap: 16,
                padding: '10px 18px',
                borderTop: '1px solid var(--line)',
                fontSize: 12,
                background: 'var(--panel)',
              }}
            >
              <Hint keys="↑↓">move</Hint>
              <Hint keys="↵">run</Hint>
              <Hint keys="⇥">ask Cap</Hint>
              <Hint keys="⌘↵">open in Inbox</Hint>
            </div>
          </>
        ) : (
          <AnswerPane answer={answer} onOpenInbox={openInInbox} onRun={run} />
        )}
      </div>
    </>
  );
}
