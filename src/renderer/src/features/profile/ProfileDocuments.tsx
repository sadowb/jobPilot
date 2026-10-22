import { useEffect, useRef, useState } from 'react';
import { documentError } from './personal';
import { documentStore, type ProfileDocument } from './documents';
import { Glyph } from './icons';
import { DOCUMENTS_CHANGED } from './useDocumentCount';
import { useProfileIdentity } from './useProfileIdentity';

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
    <li className="pf-docrow">
      <CvThumb />
      <div className="pf-doc-main">
        <strong>{label}</strong>
        <span>
          {doc.forJobs ? `For ${doc.forJobs} jobs` : `${ext} · ${Math.max(1, Math.round(doc.file.size / 1024))} KB`}
        </span>
      </div>
      <span className="pf-doc-col">{doc.language ?? 'Not set'}</span>
      <span className="pf-doc-col">{updatedText}</span>
      <div className="profile-actions">
        <a
          className="btn sm ghost"
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
        <button
          className="btn sm ghost"
          type="button"
          disabled={busy}
          onClick={onRemove}
          aria-label={`Remove ${doc.name}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}

/** Small CV preview. Always light: it depicts a printed page, in both themes. */
function CvThumb() {
  return (
    <span className="pf-thumb" aria-hidden="true">
      <i className="h" />
      <i />
      <i className="a" />
      <i />
      <i />
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
    <section className="pf-docs" aria-labelledby="your-documents-title">
      <div className="pf-docs-head">
        <div>
          <h2 id="your-documents-title">
            CVs <span className="pf-count">{docs.length}</span>
          </h2>
          <p>The agent reads what each CV is for and picks one per job. Uploads stay on this device.</p>
        </div>
        <button className="btn sm" type="button" disabled={loading || busy} onClick={() => input.current?.click()}>
          <Glyph name="upload" size={15} /> {busy ? 'Saving…' : 'Upload CV'}
        </button>
      </div>
      <p className="pf-banner">
        <Glyph name="check" size={15} />
        <span>
          {name ? (
            <>
              Employers always receive <b>{fileName}</b>. The names below are only for you.
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
        <div className="pf-doclist">
          <div className="pf-dochead" aria-hidden="true">
            <span />
            <span>CV</span>
            <span>Language</span>
            <span>Last change</span>
            <span />
          </div>
          <ul>
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
        <div className="profile-upload-empty">
          <CvThumb />
          <div>
            <strong>Your next chapter starts with your CV.</strong>
            <p>Add a CV, cover letter, or transcript. PDF or DOCX, up to 20 MB.</p>
          </div>
        </div>
      )}
      {pendingRemove && (
        <div className="profile-remove-confirm" role="group" aria-label="Confirm document removal">
          <span>Remove {docs.find((d) => d.id === pendingRemove)?.name} from this device?</span>
          <div className="profile-actions">
            <button type="button" className="btn sm ghost" disabled={busy} onClick={() => setPendingRemove(null)}>
              Keep file
            </button>
            <button type="button" className="btn sm neg" disabled={busy} onClick={() => void remove(pendingRemove)}>
              Remove file
            </button>
          </div>
        </div>
      )}
      <div className="profile-answer-footer">
        <span aria-live="polite">
          {error ? (
            <span role="alert" className="profile-error">
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
