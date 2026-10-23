import { useEffect, useMemo, useRef, useState } from 'react';
import { AppButton } from '../components/AppButton';
import { Eyebrow, cn } from '../../../components/ui';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17Icon } from '../../../components/V17Icon';
import { V17Kbd } from '../../../components/V17Kbd';
import { shortDate } from '../format';
import { formatCrewTime } from '../upnext/queue';
import { parsePaste, summarize, type ParsedLink, type PasteContext } from './parse';

const TIPS = [
  { key: '⌘V', title: 'Anywhere', body: 'Paste on any screen: an email, Slack, notes.' },
  { key: 'DROP', title: 'Sheet', body: 'CSV or XLSX, same as Import sheet today.' },
  { key: 'ALT⇧J', title: 'Extension', body: 'Sends the job links on the tab you’re on.' },
  { key: 'ASK', title: 'Ask Cap', body: '“Add the Greenhouse links from my fall list.”' },
] as const;

const MUTED_PILL = 'bg-line text-muted';

function statusPill(l: ParsedLink): { label: string; tone: string } {
  switch (l.kind) {
    case 'applied':
      return {
        label: l.appliedOn ? `Already applied · ${shortDate(l.appliedOn)}` : 'Already applied',
        tone: MUTED_PILL,
      };
    case 'queued':
      return { label: 'Already in Up next', tone: MUTED_PILL };
    case 'duplicate':
      return { label: 'Duplicate in this paste', tone: MUTED_PILL };
    case 'invalid':
      return { label: 'Not a job page', tone: 'bg-[var(--st-bad-bg)] text-[var(--st-bad-fg)]' };
    default:
      return l.createsAccount
        ? {
            label: `${l.site} · ~${l.estimateMin} min · creates an account`,
            tone: 'bg-[var(--st-amber-bg)] text-[var(--st-amber-fg)]',
          }
        : { label: 'New', tone: 'bg-work-tint text-work' };
  }
}

function LinkRow({ link, index, onRemove }: { link: ParsedLink; index: number; onRemove: () => void }) {
  const skipped = link.kind !== 'new';
  const p = statusPill(link);
  const delay = 240 + 110 * Math.min(index, 8);
  return (
    <div
      className="relative grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-bg px-3 py-2.5"
      // Per-row stagger for the read-then-resolve animation (jp-aj-* in styles/index.css).
      style={{ ['--d' as string]: `${delay}ms` }}
      aria-label={`${link.company}: ${p.label}`}
    >
      <div
        className="col-start-1 row-start-1 min-w-0 animate-jp-aj-out self-center motion-reduce:animate-none truncate font-mono text-[12.5px] text-muted opacity-0"
        aria-hidden="true"
      >
        {link.url}
      </div>
      <div className="col-start-1 row-start-1 min-w-0 animate-jp-aj-in motion-reduce:animate-none">
        <div
          className={cn(
            'flex min-w-0 items-center gap-3',
            link.kind === 'invalid' ? 'opacity-55' : skipped && 'opacity-60',
          )}
        >
          {link.kind === 'invalid' ? (
            <span className="size-[34px] flex-none rounded-[10px] border border-dashed border-line-2" />
          ) : (
            <V17AgentBot name={link.company} state={skipped ? 'done' : 'idle'} size={34} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold">{link.company}</div>
            <div className="truncate text-[12.5px] text-muted">
              {link.kind === 'invalid' ? link.site : `${link.role || 'Role read when opened'} · ${link.site}`}
            </div>
          </div>
          <span
            className={cn(
              'inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap',
              p.tone,
            )}
          >
            {p.label}
          </span>
          <button
            type="button"
            className="ml-1 grid cursor-pointer place-items-center border-0 bg-transparent p-0 text-[13px]! text-muted!"
            aria-label={`Remove ${link.company}`}
            onClick={onRemove}
          >
            <V17Icon name="close" />
          </button>
        </div>
      </div>
      <i className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-jp-aj-read bg-brand opacity-0 motion-reduce:animate-none" />
    </div>
  );
}

/**
 * Add jobs sheet: reads pasted text into job cards, shows what will be queued and what is skipped (already
 * applied, already queued, duplicate, not a job page), and queues the rest on Enter. Esc closes.
 */
export function AddJobsDialog({
  initialText,
  from,
  context,
  onQueue,
  onClose,
}: {
  initialText: string;
  from: 'clipboard' | 'typed';
  context: PasteContext;
  onQueue: (links: ParsedLink[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [draft, setDraft] = useState('');
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());
  const dialogRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parsePaste(text, context), [text, context]);
  const kept = useMemo(() => summarize(parsed.links.filter((l) => !dropped.has(l.key))), [parsed, dropped]);
  const empty = kept.links.length === 0;

  const commitDraft = () => {
    if (!draft.trim()) return;
    setText((t) => (t ? `${t}\n${draft}` : draft));
    setDraft('');
  };
  const queue = () => {
    if (kept.toQueue.length) onQueue(kept.toQueue);
  };

  // Pastes made while the sheet is open append to what is already read.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.clipboardData?.getData('text');
      if (!t) return;
      e.preventDefault();
      setText((prev) => (prev ? `${prev}\n${t}` : t));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (
      e.key === 'Enter' &&
      !(e.target instanceof HTMLTextAreaElement) &&
      !(e.target instanceof HTMLButtonElement)
    ) {
      e.preventDefault();
      queue();
    } else if (e.key === 'Tab') {
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea');
      const first = nodes?.[0];
      const last = nodes?.[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  const n = kept.links.length;
  const q = kept.toQueue.length;
  return (
    <>
      <div
        className="fixed inset-0 z-20 bg-[rgb(20_33_27_/_0.25)] backdrop-blur-[8px] dark:bg-black/45 [[data-platform=darwin]_&]:!top-[var(--app-toolbar-height)]"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add jobs"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="fixed top-[104px] left-1/2 z-[21] box-border flex max-h-[calc(100vh-124px)] w-[760px] -translate-x-1/2 flex-col overflow-y-auto rounded-3xl border border-line-2 bg-bg px-[26px] py-6 shadow-float outline-none focus-visible:outline-none!"
      >
        <div className="flex flex-nowrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>Add jobs</Eyebrow>
            <div className="mt-1.5 font-serif text-[30px] leading-tight font-normal tracking-[-0.015em]">
              Paste links,{' '}
              <span className="font-serif text-[1em] font-light tracking-[-0.01em] italic">
                watch them become jobs.
              </span>
            </div>
            <div className="mt-1.5 text-[13px] text-muted">
              Paste anything: links, a whole email, a sheet. Cap reads each link before it joins Up next.
            </div>
          </div>
          <div className="flex flex-nowrap items-center gap-2 self-start">
            <V17Kbd>Esc</V17Kbd>
            <AppButton variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
              <V17Icon name="close" />
            </AppButton>
          </div>
        </div>
        <div className="mt-[18px] flex flex-nowrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed border-line-2 px-4 py-3">
          {empty ? (
            <textarea
              className="min-h-11 w-full resize-none border-0 bg-transparent font-sans text-[13.5px] text-ink outline-0 focus-visible:outline-3 focus-visible:outline-ink focus-visible:outline-offset-2 placeholder:text-muted"
              aria-label="Paste links, an email, or a sheet"
              placeholder="Paste links, an email, or a sheet here (⌘V)"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={(e) => {
                // Handled by the window listener so the text lands in `text`, not the draft.
                e.stopPropagation();
                const t = e.clipboardData.getData('text');
                if (t) {
                  e.preventDefault();
                  setText((prev) => (prev ? `${prev}\n${t}` : t));
                }
              }}
              onBlur={commitDraft}
            />
          ) : (
            <span className="flex min-w-0 flex-nowrap items-center gap-2.5 text-[13.5px]">
              <span className="font-mono text-[11.5px] tracking-[0.06em] text-ink-2">⌘V</span>
              {n} {n === 1 ? 'link' : 'links'} pasted · {q} {q === 1 ? 'job' : 'jobs'} to queue · {kept.skipped} skipped
            </span>
          )}
          <span className="font-mono text-[11.5px] whitespace-nowrap text-muted">from · {from}</span>
        </div>
        {n > 0 && (
          <div className="mt-3.5 flex flex-col gap-2">
            {kept.links.map((l, i) => (
              <LinkRow key={l.key} link={l} index={i} onRemove={() => setDropped((d) => new Set(d).add(l.key))} />
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-nowrap items-center justify-between gap-3">
          <span className="text-[13px] text-muted">
            {q} to queue · {formatCrewTime(kept.minutes)} crew time
            {kept.accounts > 0 && (
              <>
                {' '}
                · {kept.accounts} {kept.accounts === 1 ? 'creates a site account' : 'create site accounts'}
              </>
            )}
          </span>
          <div className="flex flex-nowrap items-center gap-2">
            <AppButton variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton variant="primary" size="sm" disabled={q === 0} onClick={queue}>
              Queue {q} <V17Kbd>↵</V17Kbd>
            </AppButton>
          </div>
        </div>
        <div className="mt-5 flex flex-nowrap items-start gap-[18px]">
          {TIPS.map((t) => (
            <div key={t.key} className="min-w-0 flex-1 border-t border-line pt-3">
              <span className="font-mono text-[11.5px] tracking-[0.06em] text-ink-2">{t.key}</span>
              <div className="mt-1.5 text-[13.5px] font-semibold">{t.title}</div>
              <div className="mt-0.5 text-[12.5px] leading-[1.45] text-muted">{t.body}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
