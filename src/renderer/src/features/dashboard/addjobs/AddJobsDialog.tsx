import { useEffect, useRef, useState } from 'react';
import type { IngestResult } from '../../../../../shared/dto';
import { Button, Dialog, Input, Kbd, Status, Textarea } from '../../../components/ui';

function candidates(text: string) {
  return [...new Set((text.match(/https?:\/\/[^\s,<>"'“”]+/gi) ?? []).map((url) => url.replace(/[.!?;:)}\]]+$/, '')))];
}

type Row = { id: number; url: string; result?: IngestResult; added?: boolean; addError?: string };

export function AddJobsDialog({
  initialText,
  onAdded,
  onClose,
}: {
  initialText: string;
  onAdded: () => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const nextId = useRef(50);
  const [rows, setRows] = useState<Row[]>(() =>
    candidates(initialText)
      .slice(0, 50)
      .map((url, id) => ({ id, url })),
  );
  const active = useRef(new Set<number>());
  const adding = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    for (const row of rows) {
      if (active.current.size >= 3) break;
      if (row.result || active.current.has(row.id)) continue;
      active.current.add(row.id);
      void (async () => {
        let result: IngestResult;
        try {
          result = await window.jobpilot!.postings.ingest(row.url);
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
  }, [rows]);

  const ready = rows.filter((row) => row.result?.ok && !row.result.alreadyTracked && !row.added);
  const reading = rows.some((row) => !row.result);
  const summary = `Added ${added} · ${rows.filter((row) => row.result?.ok && row.result.alreadyTracked).length} already in your list · ${rows.filter((row) => row.result && !row.result.ok && row.result.code === 'UNSUPPORTED_ATS').length} unsupported`;

  const submit = async () => {
    if (adding.current || reading || !ready.length) return;
    adding.current = true;
    setBusy(true);
    setError(null);
    try {
      const postingIds = new Set<string>();
      for (const row of ready) {
        if (!row.result?.ok) continue;
        try {
          if (!postingIds.has(row.result.posting.postingId)) {
            await window.jobpilot!.applications.create(row.result.posting.postingId);
            postingIds.add(row.result.posting.postingId);
            setAdded((count) => count + 1);
          }
          setRows((current) =>
            current.map((item) => (item.id === row.id ? { ...item, added: true, addError: undefined } : item)),
          );
        } catch {
          setRows((current) =>
            current.map((item) =>
              item.id === row.id ? { ...item, addError: 'Could not add this job. Please try again.' } : item,
            ),
          );
        }
      }
      await onAdded();
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
      title="Paste job links"
      eyebrow="Add jobs"
      description="Paste links or an entire email. We’ll read up to 50 jobs, then add the ready ones to Up next."
      note={
        <>
          <Kbd>⌘↵</Kbd> to add
        </>
      }
      onSubmit={() => void submit()}
      actions={
        <>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onClose}>
            {added ? 'Done' : 'Cancel'}
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={busy || reading || !ready.length}>
            {busy ? 'Adding…' : `Add ${ready.length} jobs`}
          </Button>
        </>
      }
    >
      <div
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void submit();
          }
        }}
      >
        <label className="flex flex-col gap-2 text-[13px]">
          Job links
          <Textarea
            rows={4}
            value={text}
            disabled={busy}
            placeholder="https://…\nhttps://…"
            onChange={(event) => {
              const value = event.target.value;
              setText(value);
              setRows((current) =>
                candidates(value)
                  .slice(0, 50)
                  .map((url) => current.find((row) => row.url === url) ?? { id: nextId.current++, url }),
              );
            }}
          />
        </label>
        {candidates(text).length >= 50 && (
          <p role="status" className="mt-2 text-sm text-muted">
            50-link limit reached. Only the first 50 unique links are included.
          </p>
        )}
        {text.trim() && !rows.length && (
          <p role="status" className="mt-2 text-sm text-muted">
            Paste links starting with http:// or https://.
          </p>
        )}
        <ol aria-label="Job previews" aria-live="polite" className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const result = row.result;
            const status = row.added
              ? 'added'
              : !result
                ? 'reading'
                : result.ok
                  ? result.alreadyTracked
                    ? 'already in your list'
                    : 'ready'
                  : result.code === 'UNSUPPORTED_ATS'
                    ? 'unsupported'
                    : 'failed';
            return (
              <li key={row.id} className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">Link {index + 1}</span>
                  <Status
                    kind={
                      status === 'failed'
                        ? 'bad'
                        : status === 'reading'
                          ? 'work'
                          : status === 'ready' || status === 'added'
                            ? 'done'
                            : 'idle'
                    }
                  >
                    {status}
                  </Status>
                </div>
                <p className="mt-2 truncate text-xs text-muted" title={row.url}>
                  {row.url}
                </p>
                {result?.ok && (
                  <div className="mt-2">
                    <div className="text-sm font-semibold">{result.posting.company}</div>
                    <h3 className="mt-1 text-lg">{result.posting.title}</h3>
                    <p className="text-sm text-muted">
                      {[result.posting.location, result.posting.ats].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
                {result && !result.ok && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-muted">{result.message}</p>
                    <Input
                      aria-label={`Edit link ${index + 1}`}
                      defaultValue={row.url}
                      disabled={busy}
                      onBlur={(event) => {
                        const url = event.target.value.trim();
                        if (url !== row.url)
                          setRows((current) =>
                            current.map((item) => (item.id === row.id ? { id: nextId.current++, url } : item)),
                          );
                      }}
                    />
                  </div>
                )}
                {row.addError && (
                  <p role="alert" className="mt-2 text-sm text-bad">
                    {row.addError}
                  </p>
                )}
                {!row.added && (
                  <div className="mt-2 flex gap-2">
                    {status === 'failed' && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          setRows((current) =>
                            current.map((item) => (item.id === row.id ? { id: nextId.current++, url: row.url } : item)),
                          )
                        }
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      aria-label={`Remove link ${index + 1}`}
                      onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p role="status" aria-live="polite" className="mt-4 text-sm text-muted">
          {summary}
        </p>
        {error && (
          <p role="alert" className="mt-3 text-bad">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
