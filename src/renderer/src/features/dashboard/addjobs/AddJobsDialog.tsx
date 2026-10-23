import { useState } from 'react';
import type { PostingPreview } from '../../../../../shared/dto';
import { Dialog, Input } from '../../../components/ui';
import { AppButton } from '../components/AppButton';

export function AddJobsDialog({
  initialText,
  onAdded,
  onClose,
}: {
  initialText: string;
  onAdded: () => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialText.trim());
  const [preview, setPreview] = useState<PostingPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (preview) {
        await window.jobpilot!.applications.create(preview.postingId);
        await onAdded();
      } else {
        const result = await window.jobpilot!.postings.ingest(url.trim());
        if (result.ok) setPreview(result.posting);
        else setError(result.message);
      }
    } catch {
      setError(
        preview
          ? 'Could not add this job. Please try again.'
          : 'Use a valid HTTPS job URL, at most 2048 characters, without credentials or a custom port.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Paste a job URL"
      eyebrow="Add jobs"
      description="Preview a posting, then add it to Up next."
      onSubmit={() => {
        if (!busy) void submit();
      }}
      actions={
        <>
          <AppButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="primary" size="sm" type="submit" disabled={busy || !url.trim()}>
            {busy ? 'Reading…' : preview ? 'Add to Up next' : 'Preview job'}
          </AppButton>
        </>
      }
    >
      <label className="flex flex-col gap-2 text-[13px]">
        Job URL
        <Input
          value={url}
          disabled={busy}
          onChange={(event) => {
            setUrl(event.target.value);
            setPreview(null);
            setError(null);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-[var(--st-bad-fg)]">
          {error}
        </p>
      )}
      {preview && (
        <section aria-label="Posting preview" className="mt-4 rounded-2xl border border-line bg-bg p-4">
          <div className="font-semibold">{preview.company}</div>
          <h3 className="mt-1 text-lg">{preview.title}</h3>
          <p className="text-sm text-muted">
            {[preview.location, preview.salary, preview.ats].filter(Boolean).join(' · ')}
          </p>
          {preview.description && <p className="mt-3 text-sm">{preview.description}</p>}
        </section>
      )}
    </Dialog>
  );
}
