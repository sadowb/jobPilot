import { useEffect, useRef, useState } from 'react';
import { documentError } from './personal';
import { documentStore, type ProfileDocument } from './documents';
import { V17MiniPaper } from '../../components/V17MiniPaper';

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
  return (
    <div className="profile-document">
      <V17MiniPaper />
      <div className="profile-document-info">
        <strong>{doc.name}</strong>
        <p>
          {doc.name.split('.').at(-1)?.toUpperCase()} · {Math.max(1, Math.round(doc.file.size / 1024))} KB · Added{' '}
          {new Date(doc.uploaded).toLocaleDateString()}
        </p>
        <span className="profile-local">Stored on this device</span>
      </div>
      <div className="profile-actions">
        <a
          className="btn sm"
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
    </div>
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
      setPendingRemove(null);
      setMessage('Document removed from this device.');
    } catch {
      setError('Could not remove this document. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="profile-card" aria-labelledby="your-documents-title">
      <div className="profile-card-heading">
        <span className="profile-number">CV</span>
        <div>
          <h2 id="your-documents-title">Your CV & supporting documents</h2>
          <p>
            Keep your files together. Uploads stay on this device; importing a file does not fill your profile
            automatically.
          </p>
        </div>
      </div>
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
        <div className="profile-document-list">
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              busy={busy}
              onError={setError}
              onRemove={() => setPendingRemove(doc.id)}
            />
          ))}
        </div>
      ) : (
        <div className="profile-upload-empty">
          <V17MiniPaper />
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
        <button className="btn sm pri" type="button" disabled={loading || busy} onClick={() => input.current?.click()}>
          {busy ? 'Saving…' : '+ Upload document'}
        </button>
      </div>
    </section>
  );
}
