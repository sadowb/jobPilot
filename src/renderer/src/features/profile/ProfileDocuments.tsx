import { useEffect, useRef, useState } from 'react';
import { cn } from '../../components/ui';
import { PButton, ghostLinkButton } from './buttons';
import { documentError } from './personal';
import { documentStore, type ProfileDocument } from './documents';
import { Glyph } from './icons';
import { actionsRow, sectionTitle } from './styles';
import { DOCUMENTS_CHANGED } from './useDocumentCount';
import { useProfileIdentity } from './useProfileIdentity';

const DOC_COLUMNS = 'grid grid-cols-[36px_minmax(0,1fr)_110px_130px_auto] items-center gap-4';
const docColumn = 'text-[12.5px] text-muted [@media(width<=800px)]:hidden';

function DocumentRow({
  doc,
  onRemove,
  busy,
  onError,
}: {
  doc: ProfileDocument;
  onRemove: () => void;
  busy: boolean;
  onError: (message: string) => void;
}) {
  const download = useRef<HTMLAnchorElement>(null);
  const [saving, setSaving] = useState(false);
  const saveCopy = async () => {
    if (saving || !window.jobpilot) return;
    setSaving(true);
    onError('');
    try {
      await window.jobpilot.documents.save(doc.name, new Uint8Array(await doc.file.arrayBuffer()));
    } catch {
      onError('Could not save a copy. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    const next = URL.createObjectURL(doc.file);
    if (download.current) download.current.href = next;
    return () => URL.revokeObjectURL(next);
  }, [doc.file]);
  const ext = doc.name.split('.').at(-1)?.toUpperCase() ?? '';
  const label = doc.name.replace(/\.[^.]+$/, '') || doc.name;
  const updated = new Date(doc.uploaded);
  const updatedText = Number.isNaN(updated.getTime())
    ? ''
    : `Updated ${updated.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  return (
    <li
      className={cn(
        DOC_COLUMNS,
        'min-h-16 border-t border-line px-5 py-2 text-sm first:border-t-0 [@media(width<=800px)]:grid-cols-[36px_minmax(0,1fr)]',
      )}
    >
      <CvThumb />
      <div className="min-w-0">
        <strong className="block font-semibold [overflow-wrap:anywhere]">{label}</strong>
        <span className="text-[12.5px] text-muted">
          {doc.forJobs ? `For ${doc.forJobs} jobs` : `${ext} · ${Math.max(1, Math.round(doc.file.size / 1024))} KB`}
        </span>
      </div>
      <span className={docColumn}>{doc.language ?? 'Not set'}</span>
      <span className={docColumn}>{updatedText}</span>
      <div className={cn(actionsRow, '[@media(width<=800px)]:col-span-full')}>
        <a
          className={ghostLinkButton}
          ref={download}
          download={doc.name}
          aria-label={`Download ${doc.name}`}
          aria-disabled={saving}
          onClick={(e) => {
            if (window.jobpilot) {
              e.preventDefault();
              void saveCopy();
            }
          }}
        >
          {saving ? 'Saving…' : 'Download'}
        </a>
        <PButton variant="ghost" disabled={busy} onClick={onRemove} aria-label={`Remove ${doc.name}`}>
          Remove
        </PButton>
      </div>
    </li>
  );
}

const THUMB_LINE = 'block h-0.5 rounded-[1px] bg-[#dcdcdc]';

/** Small CV preview. Always light: it depicts a printed page, in both themes. */
function CvThumb({ large = false }: { large?: boolean }) {
  return (
    <span
      className={cn(
        'box-border flex flex-col gap-[2.5px] rounded-[4px] border border-[#dadada] bg-[#fcfcfb] px-1 py-[5px] shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
        large ? 'h-14 w-11' : 'h-9 w-7',
      )}
      aria-hidden="true"
    >
      <i className="block h-[3px] w-[62%] rounded-[1px] bg-[#3a3a3a]" />
      <i className={THUMB_LINE} />
      <i className="block h-0.5 w-[40%] rounded-[1px] bg-[#00846a]" />
      <i className={THUMB_LINE} />
      <i className={THUMB_LINE} />
    </span>
  );
}

export function ProfileDocuments() {
  const [docs, setDocs] = useState<ProfileDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const { fileName, name } = useProfileIdentity();
  useEffect(() => {
    let live = true;
    void documentStore('list')
      .then((items) => {
        if (live) setDocs(items);
      })
      .catch(() => {
        if (live) setError('Could not load your documents. Reopen this page to try again.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const problem = documentError(file);
    if (problem) {
      setError(problem);
      if (input.current) input.current.value = '';
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const doc: ProfileDocument = { id: crypto.randomUUID(), name: file.name, file, uploaded: new Date().toISOString() };
    try {
      await documentStore('put', doc);
      setDocs((items) => [...items, doc]);
      window.dispatchEvent(new Event(DOCUMENTS_CHANGED));
      setMessage(`${file.name} saved on this device.`);
    } catch {
      setError('Could not save the file. Your existing documents are unchanged. Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await documentStore('delete', id);
      setDocs((items) => items.filter((d) => d.id !== id));
      window.dispatchEvent(new Event(DOCUMENTS_CHANGED));
      setPendingRemove(null);
      setMessage('Document removed from this device.');
    } catch {
      setError('Could not remove this document. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="min-w-0" aria-labelledby="your-documents-title">
      <div className="mb-3.5 flex items-end justify-between gap-4">
        <div>
          <h2 id="your-documents-title" className={cn(sectionTitle, 'flex items-baseline gap-2.5 leading-[1.2]')}>
            CVs{' '}
            <span className="font-mono text-[11px] leading-[normal] font-medium tracking-[0.06em] text-muted">
              {docs.length}
            </span>
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            The agent reads what each CV is for and picks one per job. Uploads stay on this device.
          </p>
        </div>
        <PButton className="gap-1.5!" disabled={loading || busy} onClick={() => input.current?.click()}>
          <Glyph name="upload" size={15} /> {busy ? 'Saving…' : 'Upload CV'}
        </PButton>
      </div>
      <p className="mb-5 flex items-center gap-3 rounded-[14px] bg-brand-tint px-4 py-3.5 text-[13.5px] text-ink [&_svg]:flex-none [&_svg]:text-brand-text">
        <Glyph name="check" size={15} />
        <span>
          {name ? (
            <>
              Employers always receive <b className="font-[650] [overflow-wrap:anywhere]">{fileName}</b>. The names
              below are only for you.
            </>
          ) : (
            'Add your name in About me to set the file name employers receive. The names below are only for you.'
          )}
        </span>
      </p>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx"
        className="sr-only"
        aria-label="Upload CV or document"
        disabled={loading || busy}
        onChange={(e) => void upload(e.target.files)}
      />
      {loading ? (
        <p role="status">Loading your documents…</p>
      ) : docs.length ? (
        <div className="min-w-0">
          <div
            className={cn(
              DOC_COLUMNS,
              'px-5 pb-2 font-mono text-[11px] leading-none font-medium tracking-[0.06em] text-muted uppercase [@media(width<=800px)]:hidden',
            )}
            aria-hidden="true"
          >
            <span />
            <span>CV</span>
            <span>Language</span>
            <span>Last change</span>
            <span />
          </div>
          <ul className="overflow-hidden rounded-[20px] border border-line bg-bg dark:bg-panel">
            {docs.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                busy={busy}
                onError={setError}
                onRemove={() => setPendingRemove(doc.id)}
              />
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-5 rounded-2xl border border-dashed border-line-2 bg-panel p-5">
          <CvThumb large />
          <div>
            <strong className="text-sm">Your next chapter starts with your CV.</strong>
            <p className="my-1.5 text-xs leading-[1.6] text-muted">
              Add a CV, cover letter, or transcript. PDF or DOCX, up to 20 MB.
            </p>
          </div>
        </div>
      )}
      {pendingRemove && (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bad-tint p-3.5 text-[13px]"
          role="group"
          aria-label="Confirm document removal"
        >
          <span>Remove {docs.find((d) => d.id === pendingRemove)?.name} from this device?</span>
          <div className={actionsRow}>
            <PButton variant="ghost" disabled={busy} onClick={() => setPendingRemove(null)}>
              Keep file
            </PButton>
            <PButton variant="danger" disabled={busy} onClick={() => void remove(pendingRemove)}>
              Remove file
            </PButton>
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 text-xs text-muted">
        <span aria-live="polite">
          {error ? (
            <span role="alert" className="text-bad">
              {error}
            </span>
          ) : (
            message || 'Your original files are kept as uploaded.'
          )}
        </span>
      </div>
    </section>
  );
}
