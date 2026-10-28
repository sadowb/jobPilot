import { useEffect, useState, type DragEvent } from 'react';
import { cn } from '../../components/ui';
import { DOCUMENTS_CHANGED } from '../profile/useDocumentCount';
import { documentStore, type ProfileDocument } from '../profile/documents';
import { CvThumb } from '../profile/ProfileDocuments';
import { documentContentError, documentError } from '../profile/personal';
import { GoButton, S } from '../shared-ui';
import { AsidePanel, OnboardingFrame, StepHeading } from './OnboardingFrame';

const kb = (doc: ProfileDocument) => `${Math.max(1, Math.round(doc.file.size / 1024))} KB`;

export function CvStep() {
  const [docs, setDocs] = useState<ProfileDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    documentStore('list')
      .then((items) => live && setDocs(items))
      .catch(() => live && setError('Could not load your documents. Reopen this page to try again.'));
    return () => {
      live = false;
    };
  }, []);
  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    const problem = documentError(file) ?? (await documentContentError(file));
    if (problem) {
      setBusy(false);
      return setError(problem);
    }
    const doc: ProfileDocument = { id: crypto.randomUUID(), name: file.name, file, uploaded: new Date().toISOString() };
    try {
      await documentStore('put', doc);
      setDocs((items) => [...items, doc]);
      window.dispatchEvent(new Event(DOCUMENTS_CHANGED));
    } catch {
      setError('Could not save the file. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void upload(e.dataTransfer.files[0]);
  };
  const latest = docs.at(-1);
  return (
    <OnboardingFrame
      step={2}
      minHeight={682}
      aside={
        <AsidePanel className="flex h-[420px] flex-col items-center justify-center gap-4 text-center">
          <CvThumb large />
          <strong className="text-[15px] [overflow-wrap:anywhere]">{latest ? latest.name : 'No CV yet'}</strong>
          <p className={cn(S, 'm-0 max-w-[280px] text-[13.5px]')}>
            {latest
              ? `${kb(latest)} · saved on this device. Employers receive it as uploaded.`
              : 'Your CV stays on this computer. Nothing is read or sent from here.'}
          </p>
        </AsidePanel>
      }
    >
      <StepHeading
        eyebrow="Step 2 · Your CV"
        lead="Drop your CV,"
        tail="or skip for now."
        lede="PDF or DOCX, up to 20 MB. You can add or change CVs later in Profile."
      />
      <label
        className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-line-2 bg-panel px-6 py-8 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <b className="text-[15px]">
          {busy ? 'Saving…' : latest ? 'Replace or add another file' : 'Drop a PDF or DOCX here'}
        </b>
        <span className={cn(S, 'text-[13px]')}>or click to choose a file</span>
        <input
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          aria-label="Upload CV"
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <p
        role={error ? 'alert' : 'status'}
        className={cn('m-0 min-h-5 min-w-0 truncate text-[13px]', error ? 'text-bad' : S)}
        title={error || latest?.name}
      >
        {error || (latest ? `${latest.name} saved on this device.` : '')}
      </p>
      <div className="flex gap-4">
        <GoButton to="/welcome/3" variant="primary">
          {latest ? 'Continue' : 'Skip this step'}
        </GoButton>
      </div>
    </OnboardingFrame>
  );
}
