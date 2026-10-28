import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { IngestResult } from '../../../../../shared/dto';
import { Dialog, Eyebrow, Field, Input, Textarea, Tile, cn } from '../../../components/ui';
import { controlFocus } from '../../../components/ui/controlStyles';
import { V17AgentBot, agentLook } from '../../../components/V17AgentBot';
import { V17Icon } from '../../../components/V17Icon';
import { V17Kbd } from '../../../components/V17Kbd';
import { V17StatusChip } from '../../../components/V17StatusChip';
import { AppButton } from '../components/AppButton';
import { useCreateApplication, useIngestPosting } from '../../../lib/api';

import { candidateUrls, nextRowId, reconcileRows, type Row } from './rows';

const atsNames = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  workable: 'Workable',
  smartrecruiters: 'SmartRecruiters',
  bamboohr: 'BambooHR',
};

export function AddJobsDialog({
  initialText,
  onAdded,
  onClose,
}: {
  initialText: string;
  onAdded: (ids: string[], complete: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const inputId = useId();
  const [text, setText] = useState(initialText);
  // Links the user removed, keyed by pasted URL; survives textarea edits until the URL leaves the text.
  const dismissed = useRef(new Set<string>());
  const [rows, setRows] = useState<Row[]>(() => reconcileRows(initialText, [], new Set()).rows);
  const { mutateAsync: ingest } = useIngestPosting();
  const createApplication = useCreateApplication();
  const active = useRef(new Set<number>());
  const adding = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    for (const row of rows) {
      if (active.current.size >= 3) break;
      if (row.result || active.current.has(row.id)) continue;
      active.current.add(row.id);
      void (async () => {
        let result: IngestResult;
        try {
          result = await ingest(row.url);
        } catch {
          result = {
            ok: false,
            code: 'FETCH_FAILED',
            message: 'Use a valid HTTPS job URL, at most 2048 characters, without credentials or a custom port.',
          };
        }
        active.current.delete(row.id);
        setRows((current) => current.map((item) => (item.id === row.id ? { ...item, result } : item)));
      })();
    }
  }, [rows, ingest]);

  const ready = rows.filter((row) => row.result?.ok && !row.result.alreadyTracked && !row.added);
  const readingCount = rows.filter((row) => !row.result).length;
  const reading = readingCount > 0;
  const tracked = rows.filter((row) => row.result?.ok && row.result.alreadyTracked).length;
  const unsupported = rows.filter(
    (row) => row.result && !row.result.ok && row.result.code === 'UNSUPPORTED_ATS',
  ).length;
  const failed = rows.filter(
    (row) => row.addError || (row.result && !row.result.ok && row.result.code !== 'UNSUPPORTED_ATS'),
  ).length;
  const summary = `${ready.length} ready · ${tracked} already in your list · ${unsupported} unsupported${failed ? ` · ${failed} failed` : ''}`;

  const remove = (index: number) => {
    if (busy) return;
    const source = rows[index]?.source;
    if (source === undefined) return;
    dismissed.current.add(source);
    setRows((current) => current.filter((_, i) => i !== index));
    requestAnimationFrame(() => {
      const remaining = list.current?.querySelectorAll<HTMLElement>(':scope > li');
      remaining?.[Math.min(index, remaining.length - 1)]?.focus();
    });
  };
  const retry = (row: Row, url = row.url) => {
    setEditing(null);
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { id: nextRowId(), source: item.source, url } : item)),
    );
  };

  const submit = async () => {
    if (adding.current || reading || !ready.length) return;
    adding.current = true;
    setBusy(true);
    setError(null);
    try {
      const postingIds = new Set<string>();
      const addedIds: string[] = [];
      let complete = true;
      for (const row of ready) {
        if (!row.result?.ok) continue;
        try {
          if (!postingIds.has(row.result.posting.postingId)) {
            const application = await createApplication.mutateAsync(row.result.posting.postingId);
            addedIds.push(application.id);
            postingIds.add(row.result.posting.postingId);
          }
          setRows((current) =>
            current.map((item) => (item.id === row.id ? { ...item, added: true, addError: undefined } : item)),
          );
        } catch {
          complete = false;
          setRows((current) =>
            current.map((item) =>
              item.id === row.id ? { ...item, addError: 'Could not add this job. Please try again.' } : item,
            ),
          );
        }
      }
      if (addedIds.length) await onAdded(addedIds, complete);
    } catch {
      setError('Jobs were saved, but the dashboard could not refresh. Close and reload to see them.');
    } finally {
      adding.current = false;
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={() => {
        if (!adding.current) onClose();
      }}
      title="Add jobs"
      eyebrow="Paste job links"
      className="w-[min(840px,calc(100vw-32px))] scheme-light dark:scheme-dark [&_header]:py-3 [&_footer]:shrink-0 [&_footer]:py-3"
      bodyClassName="flex min-h-0 flex-col overflow-hidden py-4"
      note={
        <span className="flex flex-col gap-1 tabular-nums">
          <span aria-busy={reading}>
            {reading ? `Reading ${readingCount} ${readingCount === 1 ? 'link' : 'links'}…` : summary}
          </span>
          <span className="flex items-center gap-1 text-muted">
            <V17Kbd>↑↓</V17Kbd> move <V17Kbd>⌫</V17Kbd> remove <V17Kbd>Esc</V17Kbd> close
          </span>
        </span>
      }
      onSubmit={() => void submit()}
      actions={
        <AppButton
          variant="primary"
          size="sm"
          type="submit"
          aria-label={`Add ${ready.length} ${ready.length === 1 ? 'job' : 'jobs'}`}
          className={cn('min-w-40 tabular-nums', controlFocus)}
          disabled={busy || reading || !ready.length}
        >
          {busy ? 'Adding…' : `Add ${ready.length} ${ready.length === 1 ? 'job' : 'jobs'}`} <V17Kbd>⌘↵</V17Kbd>
        </AppButton>
      }
    >
      <div
        className="flex min-h-0 flex-col gap-3"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void submit();
          }
        }}
      >
        <div className="shrink-0">
          <Field
            className="[&>label]:sr-only [&>span]:mb-0"
            label="Job links"
            hint="Paste a list, a spreadsheet column, or an email"
          >
            <Textarea
              id={inputId}
              rows={3}
              className="max-h-40 min-h-24 resize-none field-sizing-content font-mono [@media(height<=850px)]:max-h-24"
              value={text}
              disabled={busy}
              placeholder="Paste job links — one or fifty"
              onChange={(event) => {
                const value = event.target.value;
                setText(value);
                setRows((current) => {
                  const next = reconcileRows(value, current, dismissed.current);
                  dismissed.current = next.dismissed;
                  return next.rows;
                });
              }}
            />
          </Field>
          <Eyebrow>{rows.length} links found</Eyebrow>
          {!text.trim() && (
            <p className="mt-2 text-xs text-muted">
              Paste job links — one or fifty <V17Kbd>⌘V</V17Kbd>
            </p>
          )}
          {candidateUrls(text).length >= 50 && (
            <p role="status" className="mt-2 text-xs text-muted">
              50-link limit reached. Only the first 50 unique links are included.
            </p>
          )}
          {text.trim() && !rows.length && (
            <p role="status" className="mt-2 text-xs text-muted">
              Paste links starting with http:// or https://.
            </p>
          )}
        </div>
        {!!rows.length && (
          <ol
            ref={list}
            aria-label="Job previews"
            className="min-h-0 max-h-[min(52vh,480px)] overflow-hidden overflow-y-auto rounded-3xl border border-line bg-bg"
          >
            {rows.map((row, index) => {
              const result = row.result;
              const posting = result?.ok ? result.posting : null;
              const unsupported = result && !result.ok && result.code === 'UNSUPPORTED_ATS';
              const failed = !!row.addError || (result && !result.ok && !unsupported);
              const neutral = row.added || (result?.ok && result.alreadyTracked);
              const status = row.added
                ? 'Added'
                : !result
                  ? 'Reading'
                  : neutral
                    ? 'Already in your list'
                    : unsupported
                      ? 'Unsupported'
                      : failed
                        ? 'Failed'
                        : 'Ready';
              const reason = row.addError ?? (result && !result.ok ? result.message : '');
              const link = URL.parse(row.url);
              return (
                <li
                  key={row.id}
                  tabIndex={0}
                  title={row.url}
                  style={{ '--d': `${Math.min(index * 10, 120)}ms` } as CSSProperties}
                  className={cn(
                    'group grid h-12 min-h-[46px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto_28px] items-center gap-3 border-t border-line px-5 first:border-t-0 hover:bg-panel',
                    'animate-jp-aj-in [animation-delay:var(--d)] [animation-duration:150ms] motion-reduce:animate-none',
                    controlFocus,
                    (neutral || unsupported) && 'opacity-50',
                  )}
                  onKeyDown={(event) => {
                    if (event.target instanceof HTMLInputElement) return;
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      const next = Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
                      list.current?.querySelectorAll<HTMLElement>(':scope > li')[next]?.focus();
                    } else if (event.key === 'Backspace' && event.target === event.currentTarget) {
                      event.preventDefault();
                      remove(index);
                    }
                  }}
                >
                  {posting ? (
                    <V17AgentBot name={posting.company} look={agentLook(posting.company)} state="idle" size={28} />
                  ) : (
                    <Tile size="sm" className="size-7 text-xs">
                      ?
                    </Tile>
                  )}
                  <div className="min-w-0">
                    {editing === row.id ? (
                      <Input
                        autoFocus
                        aria-label={`Edit link ${index + 1}`}
                        defaultValue={row.url}
                        disabled={busy}
                        className="min-h-0 py-1 font-mono text-xs"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            event.stopPropagation();
                            setEditing(null);
                          }
                        }}
                        onBlur={(event) => {
                          const url = event.target.value.trim();
                          setEditing(null);
                          if (url && url !== row.url) retry(row, url);
                        }}
                      />
                    ) : (
                      <>
                        {!result ? (
                          <div aria-hidden="true" className="space-y-1.5 motion-reduce:[&_*]:animate-none">
                            <div className="h-3 w-3/4 origin-left animate-jp-aj-read rounded bg-line [animation-duration:1.4s] [animation-iteration-count:infinite]" />
                            <div className="h-2 w-1/2 animate-pulse rounded bg-line" />
                          </div>
                        ) : (
                          <>
                            <div className="truncate text-[14px] leading-tight font-semibold">
                              {posting
                                ? `${posting.company} — ${posting.title}`
                                : unsupported
                                  ? 'Unsupported job site'
                                  : 'Could not read job'}
                            </div>
                            <div
                              title={failed || unsupported ? row.url : undefined}
                              className={cn(
                                'truncate text-[12.5px] leading-[1.35] text-muted',
                                (failed || unsupported) && 'font-mono',
                              )}
                            >
                              {posting && !posting.verified && 'Apply form found, no job data · '}
                              {failed || unsupported
                                ? link
                                  ? `${link.host}${link.pathname}`
                                  : row.url
                                : posting &&
                                  [
                                    posting.ats === 'custom'
                                      ? URL.parse(posting.canonical_url)?.host
                                      : atsNames[posting.ats],
                                    posting.location,
                                    posting.country,
                                    posting.salary,
                                    posting.questions.length
                                      ? `${posting.questions.length} question${posting.questions.length === 1 ? '' : 's'}`
                                      : 'No questions found',
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {failed && (
                      <>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          className={cn('px-2', controlFocus)}
                          onClick={() => retry(row)}
                        >
                          <V17Icon name="reload" />
                          Retry
                        </AppButton>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          className={cn('px-2', controlFocus)}
                          aria-label={`Edit link ${index + 1}`}
                          onClick={() => setEditing(row.id)}
                        >
                          Edit
                        </AppButton>
                      </>
                    )}
                    {posting && !posting.verified && (
                      <V17StatusChip className="bg-[var(--st-amber-bg)] text-[var(--st-amber-fg)]">
                        <span title="Looks like an apply form, not a confirmed job posting. You confirm it before a run starts.">
                          Unverified page
                        </span>
                      </V17StatusChip>
                    )}
                    <V17StatusChip
                      className={cn(
                        'font-mono',
                        !result
                          ? 'bg-brand-tint text-brand-text'
                          : neutral
                            ? 'bg-line text-ink-2'
                            : failed || unsupported
                              ? 'bg-bad-tint text-bad'
                              : 'bg-work-tint text-work',
                      )}
                    >
                      <span title={reason || undefined} className="inline-flex items-center gap-1.5">
                        {!result && (
                          <span className="size-3 animate-jp-spin rounded-full border-2 border-transparent border-t-brand motion-reduce:animate-none" />
                        )}
                        {(failed || unsupported) && <span aria-hidden="true">▲</span>}
                        {status}
                      </span>
                    </V17StatusChip>
                  </div>
                  <AppButton
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove link"
                    disabled={busy || row.added}
                    className={cn(
                      'size-7 min-w-7 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100',
                      controlFocus,
                    )}
                    onClick={() => remove(index)}
                  >
                    <V17Icon name="close" />
                  </AppButton>
                </li>
              );
            })}
          </ol>
        )}
        {rows.some((row) => row.result && !row.result.ok && row.result.code === 'UNSUPPORTED_ATS') && (
          <p className="shrink-0 text-xs text-muted">
            Supported: Greenhouse, Lever, Ashby, Workable, SmartRecruiters, BambooHR, and pages with schema.org
            JobPosting data.
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-bad">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
