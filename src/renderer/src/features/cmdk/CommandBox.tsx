import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { CritterBot } from '../../components/CritterBot';
import { KeyCap } from '../../components/KeyCap';
import { Button, cn } from '../../components/ui';
import { controlFocus } from '../../components/ui/controlStyles';
import { useModalDialog } from '../../components/ui/Dialog';
import { PILL, S, shellButton } from '../shared-ui';
import type { JobRecord } from './jobs';
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
} as const;

/** Small uppercase mono label (section captions, answer row tags). */
const MONO_LABEL = 'font-mono text-[10.5px] tracking-[0.06em] whitespace-nowrap text-muted uppercase';
const STATUS_CHIP_CLASSES: Record<JobRecord['status'], string> = {
  Submitted: 'text-ink-2 bg-line',
  Interview: 'text-[#B45309] bg-[rgb(180_83_9/.16)]',
  Screening: 'text-[#0F766E] bg-[rgb(15_118_110/.14)]',
  Offer: 'text-brand-text bg-brand-tint',
  Rejected: 'text-[#B5412F] bg-[rgb(181_65_47/.14)]',
  Withdrawn: 'text-muted bg-line',
};

function Icon({ size, children, className }: { size: number; children: ReactNode; className?: string }) {
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
      className={className}
    >
      {children}
    </svg>
  );
}

function StatusChip({ status }: { status: JobRecord['status'] }) {
  return <span className={`${PILL} ${STATUS_CHIP_CLASSES[status]}`}>{status}</span>;
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
      <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-panel">
        <Icon size={16}>{ICONS.arrow}</Icon>
      </span>
    );
  return (
    <div
      id={domId}
      role="option"
      aria-selected={selected}
      className={cn(
        'flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
        selected && 'bg-panel shadow-[inset_3px_0_0_var(--ink)]',
      )}
      onMouseEnter={onHover}
      onClick={onRun}
    >
      {lead}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold">{result.title}</div>
        <div className={cn(S, 'truncate text-[12.5px]')}>{result.subtitle}</div>
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
    <span className="flex items-center gap-1.5">
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
      <div className="flex flex-col gap-3.5 px-[18px] pt-[18px] pb-2">
        <div className="flex items-center gap-2.5">
          <CapOnDartArt size={34} />
          <div>
            <div className="text-[14.5px] font-semibold">Cap</div>
            <div className={cn(S, 'text-[12.5px]')}>
              {answer ? answer.meta : 'answer · nothing to read for this yet'}
            </div>
          </div>
        </div>
        <p className="m-0 text-[15px] leading-[1.6] text-ink-2">
          {answer ? answer.intro : 'I can only change statuses so far, for example “set ramp to interview”.'}
        </p>
        {answer && (
          <div className="flex flex-col">
            {answer.rows.map((r) => (
              <div key={r.label} className="flex items-start gap-3.5 border-t border-line py-2.5">
                <span className={cn(MONO_LABEL, 'w-[92px] flex-none pt-[3px]')}>{r.label}</span>
                <span className="text-sm leading-normal">{r.text}</span>
              </div>
            ))}
          </div>
        )}
        {answer && <p className={cn(S, 'm-0 text-[12.5px] leading-normal')}>{answer.note}</p>}
      </div>
      <div className="flex items-center justify-between gap-2.5 border-t border-line bg-panel px-[18px] py-3">
        <span className={cn(S, 'flex items-center gap-1.5 text-[12px]')}>
          <KeyCap>Esc</KeyCap>close
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" className={shellButton()} onClick={onOpenInbox}>
            Open in Inbox&nbsp;<KeyCap>⌘↵</KeyCap>
          </Button>
          {answer?.primary && (
            <Button
              variant="primary"
              size="sm"
              className={shellButton('primary')}
              onClick={() => onRun(answer.primary!.intent)}
            >
              {answer.primary.label}&nbsp;<KeyCap>↵</KeyCap>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export interface CommandBoxProps {
  jobs?: readonly JobRecord[];
  initialQuery?: string;
  /** Called with the chosen intent; the box closes after. */
  onRun?: (intent: CommandIntent) => void;
  /** ⌘↵: continue the query in Inbox (the pilot thread). */
  onOpenInInbox?: (query: string) => void;
  onClose: () => void;
}

/** The ⌘K command box: results (V17_CmdK) and the inline answer (V17_CmdK_Answer). Render only while open. */
export function CommandBox({ jobs = [], initialQuery = '', onRun, onOpenInInbox, onClose }: CommandBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<'results' | 'answer'>('results');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useModalDialog(dialogRef);
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

  const offsets = sections.map((_, i) => sections.slice(0, i).reduce((n, s) => n + s.results.length, 0));

  return (
    <dialog
      ref={dialogRef}
      aria-label="Ask Cap"
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'fixed top-24 left-1/2 m-0 max-h-[calc(100vh-128px)] max-w-[calc(100vw-32px)] overflow-x-hidden overflow-y-auto',
        'rounded-[20px] border border-line-2 bg-bg p-0 text-ink shadow-float [transform:translateX(-50%)]',
        'backdrop:bg-[rgb(0_0_0/0.25)] backdrop:backdrop-blur-[8px] dark:backdrop:bg-[rgb(0_0_0/0.45)]',
        mode === 'answer' ? 'w-[680px]' : 'w-[640px]',
      )}
    >
      <div className="flex items-center gap-3 border-b border-line px-[18px] py-4">
        <Icon size={18} className="flex-none text-muted">
          <circle cx="11" cy="11" r="7" />
          {ICONS.search}
        </Icon>
        <input
          ref={inputRef}
          className={cn(
            'min-w-0 flex-1 rounded-sm border-0 bg-transparent p-0 text-[17px] text-ink placeholder:text-muted placeholder:opacity-100',
            controlFocus,
          )}
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
              <div key={s.label} role="group" aria-label={s.label} className="px-2 pt-1.5 pb-1">
                <span className={cn(MONO_LABEL, 'block px-2.5 pt-1.5 pb-1')}>{s.label}</span>
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
          <div className={cn(S, 'flex items-center gap-4 border-t border-line bg-panel px-[18px] py-2.5 text-[12px]')}>
            <Hint keys="↑↓">move</Hint>
            <Hint keys="↵">run</Hint>
            <Hint keys="⇥">ask Cap</Hint>
            <Hint keys="⌘↵">open in Inbox</Hint>
          </div>
        </>
      ) : (
        <AnswerPane answer={answer} onOpenInbox={openInInbox} onRun={run} />
      )}
    </dialog>
  );
}
