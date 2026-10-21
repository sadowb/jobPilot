import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17Icon } from '../../../components/V17Icon';
import { V17Kbd } from '../../../components/V17Kbd';
import '../../../components/v17-status.css';
import { shortDate } from '../format';
import { formatCrewTime } from '../upnext/queue';
import { parsePaste, summarize, type ParsedLink, type PasteContext } from './parse';
import './addjobs.css';

const pill: CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 99,
  padding: '3px 10px',
  whiteSpace: 'nowrap',
};
const subline: CSSProperties = { fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const removeBtn: CSSProperties = {
  fontSize: 13,
  marginLeft: 4,
  display: 'grid',
  placeItems: 'center',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
};
const tip: CSSProperties = { flex: 1, minWidth: 0, borderTop: '1px solid var(--line)', paddingTop: 12 };
const rowCard: CSSProperties = {
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: '10px 12px',
  background: 'var(--bg)',
  overflow: 'hidden',
};

const TIPS = [
  { key: '⌘V', title: 'Anywhere', body: 'Paste on any screen: an email, Slack, notes.' },
  { key: 'DROP', title: 'Sheet', body: 'CSV or XLSX, same as Import sheet today.' },
  { key: 'ALT⇧J', title: 'Extension', body: 'Sends the job links on the tab you’re on.' },
  { key: 'ASK', title: 'Ask Cap', body: '“Add the Greenhouse links from my fall list.”' },
] as const;

function statusPill(l: ParsedLink): { label: string; style: CSSProperties } {
  switch (l.kind) {
    case 'applied':
      return {
        label: l.appliedOn ? `Already applied · ${shortDate(l.appliedOn)}` : 'Already applied',
        style: { color: 'var(--muted)', background: 'var(--line)' },
      };
    case 'queued':
      return { label: 'Already in Up next', style: { color: 'var(--muted)', background: 'var(--line)' } };
    case 'duplicate':
      return { label: 'Duplicate in this paste', style: { color: 'var(--muted)', background: 'var(--line)' } };
    case 'invalid':
      return { label: 'Not a job page', style: { color: 'var(--st-bad-fg)', background: 'var(--st-bad-bg)' } };
    default:
      return l.createsAccount
        ? {
            label: `${l.site} · ~${l.estimateMin} min · creates an account`,
            style: { color: 'var(--st-amber-fg)', background: 'var(--st-amber-bg)' },
          }
        : { label: 'New', style: { color: 'var(--work)', background: 'var(--work-tint)' } };
  }
}

function LinkRow({ link, index, onRemove }: { link: ParsedLink; index: number; onRemove: () => void }) {
  const skipped = link.kind !== 'new';
  const p = statusPill(link);
  const delay = 240 + 110 * Math.min(index, 8);
  return (
    <div
      className="v17a-row"
      style={{ ...rowCard, ['--d' as string]: `${delay}ms` }}
      aria-label={`${link.company}: ${p.label}`}
    >
      <div
        className="v17a-raw"
        aria-hidden="true"
        style={{
          alignSelf: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 12.5,
          color: 'var(--muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {link.url}
      </div>
      <div className="v17a-card" style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
            opacity: link.kind === 'invalid' ? 0.55 : skipped ? 0.6 : undefined,
          }}
        >
          {link.kind === 'invalid' ? (
            <span
              style={{ width: 34, height: 34, borderRadius: 10, border: '1px dashed var(--line-2)', flex: 'none' }}
            />
          ) : (
            <V17AgentBot name={link.company} state={skipped ? 'done' : 'idle'} size={34} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{link.company}</div>
            <div className="s" style={subline}>
              {link.kind === 'invalid' ? link.site : `${link.role || 'Role read when opened'} · ${link.site}`}
            </div>
          </div>
          <span style={{ ...pill, ...p.style }}>{p.label}</span>
          <button
            type="button"
            className="s"
            aria-label={`Remove ${link.company}`}
            style={removeBtn}
            onClick={onRemove}
          >
            <V17Icon name="close" />
          </button>
        </div>
      </div>
      <i className="v17a-bar" />
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
      <div className="scrim" style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add jobs"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          position: 'fixed',
          left: '50%',
          top: 104,
          transform: 'translateX(-50%)',
          width: 760,
          maxHeight: 'calc(100vh - 124px)',
          overflowY: 'auto',
          boxSizing: 'border-box',
          background: 'var(--bg)',
          border: '1px solid var(--line-2)',
          borderRadius: 24,
          boxShadow: 'var(--float)',
          zIndex: 21,
          padding: '24px 26px 24px',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
      >
        <div className="row sp nw" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Add jobs</div>
            <div className="h2" style={{ fontSize: 30, marginTop: 6 }}>
              Paste links, <span className="it">watch them become jobs.</span>
            </div>
            <div className="s" style={{ marginTop: 6, fontSize: 13 }}>
              Paste anything: links, a whole email, a sheet. Cap reads each link before it joins Up next.
            </div>
          </div>
          <div className="row nw" style={{ gap: 8, alignSelf: 'flex-start' }}>
            <V17Kbd>Esc</V17Kbd>
            <button className="btn sm ghost" type="button" aria-label="Close" onClick={onClose}>
              <V17Icon name="close" />
            </button>
          </div>
        </div>
        <div
          className="row sp nw"
          style={{
            marginTop: 18,
            border: '1.5px dashed var(--line-2)',
            borderRadius: 16,
            padding: '12px 16px',
            gap: 12,
          }}
        >
          {empty ? (
            <textarea
              className="v17a-paste"
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
            <span className="row nw" style={{ gap: 10, fontSize: 13.5, minWidth: 0 }}>
              <span className="spec" style={{ color: 'var(--ink-2)', letterSpacing: '.06em' }}>
                ⌘V
              </span>
              {n} {n === 1 ? 'link' : 'links'} pasted · {q} {q === 1 ? 'job' : 'jobs'} to queue · {kept.skipped} skipped
            </span>
          )}
          <span className="s" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
            from · {from}
          </span>
        </div>
        {n > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {kept.links.map((l, i) => (
              <LinkRow key={l.key} link={l} index={i} onRemove={() => setDropped((d) => new Set(d).add(l.key))} />
            ))}
          </div>
        )}
        <div className="row sp nw" style={{ marginTop: 16 }}>
          <span className="s" style={{ fontSize: 13 }}>
            {q} to queue · {formatCrewTime(kept.minutes)} crew time
            {kept.accounts > 0 && (
              <>
                {' '}
                · {kept.accounts} {kept.accounts === 1 ? 'creates a site account' : 'create site accounts'}
              </>
            )}
          </span>
          <div className="row nw" style={{ gap: 8 }}>
            <button className="btn sm ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn sm pri"
              type="button"
              disabled={q === 0}
              onClick={queue}
              style={q === 0 ? { opacity: 0.5 } : undefined}
            >
              Queue {q} <V17Kbd>↵</V17Kbd>
            </button>
          </div>
        </div>
        <div className="row nw" style={{ gap: 18, marginTop: 20, alignItems: 'flex-start' }}>
          {TIPS.map((t) => (
            <div key={t.key} style={tip}>
              <span className="spec" style={{ color: 'var(--ink-2)', letterSpacing: '.06em' }}>
                {t.key}
              </span>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>{t.title}</div>
              <div className="s" style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 2 }}>
                {t.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
