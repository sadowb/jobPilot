import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileSaveSchema } from '../../../../shared/dto';
import { Button, cn } from '../../components/ui';
import { saveProfile, useCapTurn, useExtractCv } from '../../lib/api';
import { AddJobsDialog } from '../dashboard/addjobs/AddJobsDialog';
import { documentStore, type ProfileDocument } from '../profile/documents';
import { documentContentError, documentError } from '../profile/personal';
import { DOCUMENTS_CHANGED } from '../profile/useDocumentCount';
import { setProfileData } from '../profile/profileStorage';
import { A_POP, A_RISE, BUBBLE, REDUCE_ALL } from '../shared-ui';
import { EMPTY_DRAFT, applyFacts, draftFromExtraction, knownSummary, missingItems, toSaves, type Draft } from './draft';
import { OnboardingHeader } from './OnboardingHeader';
import { CapAvatar, PRESS, Spinner } from './parts';
import { ProfilePanel } from './ProfilePanel';
import { stepPath } from './steps';

type Stage = 'drop' | 'reading' | 'asking';
interface Msg {
  id: number;
  from: 'cap' | 'me';
  text: string;
}
/** A turn that failed, kept so "Try again" resends exactly it. */
interface Retry {
  text: string | null;
  history: Msg[];
}

const HISTORY_TURNS = 24;
const chip =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-2 bg-transparent px-3.5 text-sm text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50';
const CARD = cn('flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5', A_POP);

/** P2 About you: drop the CV, then a real chat with the owner's own agent, which asks for whatever the app still needs. The profile builds live on the right. */
export function AboutStep() {
  const navigate = useNavigate();
  const extract = useExtractCv();
  const capTurn = useCapTurn();
  const [stage, setStage] = useState<Stage>('drop');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hasDraft, setHasDraft] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [log, setLog] = useState<Msg[]>([]);
  const [resolved, setResolved] = useState<ReadonlySet<string>>(new Set());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [retry, setRetry] = useState<Retry | null>(null);
  const [addJobs, setAddJobs] = useState(false);
  const [jobs, setJobs] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');
  const seq = useRef(0);
  const alive = useRef(true);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const push = (from: Msg['from'], body: string) => {
    const msg = { id: seq.current++, from, text: body };
    setLog((items) => [...items, msg]);
    return msg;
  };

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' });
  }, [log, capTurn.isPending, suggestions, retry]);

  /**
   * One agent turn. The agent asks and extracts; the app decides what is missing (`missingItems`) and validates every fact
   * before it touches the draft. `history` excludes the message being answered, which travels as `message`.
   */
  const turn = async (d: Draft, r: ReadonlySet<string>, history: Msg[], message: string | null) => {
    setRetry(null);
    setSuggestions([]);
    try {
      const out = await capTurn.mutateAsync({
        history: history.slice(-HISTORY_TURNS).map((m) => ({ role: m.from === 'cap' ? 'cap' : 'owner', text: m.text })),
        known: knownSummary(d),
        missing: missingItems(d, r),
        text: message,
      });
      if (!alive.current) return;
      // Functional updates: the owner may have edited the panel while the agent was thinking.
      setDraft((current) => applyFacts(current, out.facts));
      setResolved((current) => new Set([...current, ...out.settled]));
      push('cap', out.reply);
      setSuggestions(out.suggestions);
    } catch {
      if (alive.current) setRetry({ text: message, history });
    }
  };

  const readCv = async (picked: File | undefined) => {
    if (!picked || stage !== 'drop') return;
    setError('');
    const problem = documentError(picked) ?? (await documentContentError(picked));
    if (problem) return setError(problem);
    setFile(picked);
    setStage('reading');
    try {
      const x = await extract.mutateAsync({ name: picked.name, bytes: new Uint8Array(await picked.arrayBuffer()) });
      if (!alive.current) return;
      const next = draftFromExtraction(x);
      setDraft(next);
      setHasDraft(true);
      setStage('asking');
      await turn(next, resolved, [], null);
    } catch (cause) {
      if (!alive.current) return;
      setStage('drop');
      setFile(null);
      setError(cause instanceof Error ? cause.message : 'Cap could not read this CV.');
    }
  };

  // The whole window is a drop target while waiting for the CV.
  useEffect(() => {
    if (stage !== 'drop') return;
    const over = (event: globalThis.DragEvent) => event.preventDefault();
    const drop = (event: globalThis.DragEvent) => {
      event.preventDefault();
      void readCv(event.dataTransfer?.files[0]);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const send = (value: string) => {
    const body = value.trim();
    if (!body || stage !== 'asking' || capTurn.isPending) return;
    setText('');
    const history = log;
    push('me', body);
    void turn(draft, resolved, history, body);
  };

  const missing = missingItems(draft, resolved);
  const left = missing.length;

  const confirm = async () => {
    if (!file || saving) return;
    setSaving(true);
    setError('');
    try {
      const saves = toSaves(draft).map((save) => ProfileSaveSchema.parse(save));
      const doc: ProfileDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        file,
        uploaded: new Date().toISOString(),
      };
      await documentStore('put', doc);
      window.dispatchEvent(new Event(DOCUMENTS_CHANGED));
      for (const save of saves) setProfileData(await saveProfile(save));
      void navigate(stepPath(3));
    } catch {
      setError('Could not save your profile. Check the highlighted details and try again.');
      setSaving(false);
    }
  };

  const footer =
    stage === 'asking' && left === 0 ? (
      <Button
        variant="primary"
        disabled={saving}
        onClick={() => void confirm()}
        className={cn('h-12 w-full text-[15px] font-semibold', PRESS)}
      >
        {saving ? <Spinner className="border-on-pri/40 border-t-on-pri" /> : null}
        Ready for take-off →
      </Button>
    ) : (
      <span
        aria-disabled="true"
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-pri/45 px-5 text-[15px] font-semibold text-on-pri"
      >
        {stage === 'drop'
          ? 'Drop your CV first'
          : stage === 'reading'
            ? 'Reading your CV…'
            : `${left} thing${left === 1 ? '' : 's'} left`}
      </span>
    );

  return (
    <>
      <OnboardingHeader step={2} />
      <main className={cn('flex h-[calc(100dvh-var(--app-toolbar-height,56px))] min-h-[560px]', REDUCE_ALL)}>
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Chat with Cap">
          <div className="flex items-center gap-3 border-b border-line px-8 py-3.5">
            <CapAvatar size={38} />
            <div className="flex grow flex-col">
              <span className="text-[15px] font-semibold">Cap</span>
              <span className="text-[12.5px] text-brand-text">Chat in your own words</span>
            </div>
            {stage === 'asking' && (
              <Button variant="ghost" size="sm" onClick={() => setAddJobs(true)}>
                Paste job links
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => void navigate(stepPath(1))}>
              ← Back
            </Button>
          </div>

          <div aria-live="polite" className="flex min-h-0 grow flex-col justify-end gap-3 overflow-y-auto px-8 py-5">
            <div className={cn('flex items-start gap-3', A_POP)}>
              <CapAvatar />
              <div className={cn(BUBBLE, 'max-w-[560px] px-4 py-2.5 text-[15px]')}>
                Now you. Drop your CV and watch: I fill your profile while I read.
              </div>
            </div>
            {stage === 'drop' && (
              <div className={CARD}>
                <label className="flex cursor-pointer items-center gap-4 rounded-xl p-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
                  <span
                    aria-hidden="true"
                    className="grid size-12 flex-none animate-jp-bob place-items-center rounded-2xl bg-hover text-brand-text motion-reduce:animate-none"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 16V4M7 9l5-5 5 5" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </svg>
                  </span>
                  <span className="flex flex-col gap-1 text-[15px] font-semibold">
                    Drop your CV anywhere on this window, or click
                    <span className="text-[13px] font-normal text-muted">
                      PDF · any language · read by your own AI, on this computer
                    </span>
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    aria-label="Upload CV"
                    onChange={(event) => {
                      void readCv(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                    onDrop={(event: DragEvent) => event.stopPropagation()}
                  />
                </label>
              </div>
            )}

            {file && stage !== 'drop' && (
              <div className={cn('flex items-center gap-3 self-end', A_RISE)}>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold">{file.name}</span>
                  <span className={cn('font-mono text-xs', stage === 'reading' ? 'text-muted' : 'text-brand-text')}>
                    {stage === 'reading' ? 'Reading…' : 'Read'}
                  </span>
                </div>
                {stage === 'reading' && <Spinner label="Reading your CV" />}
              </div>
            )}

            {log.map((m) =>
              m.from === 'cap' ? (
                <div key={m.id} className={cn('flex items-start gap-3', A_POP)}>
                  <CapAvatar />
                  <div className={cn(BUBBLE, 'max-w-[560px] px-4 py-2.5 text-[15px]')}>{m.text}</div>
                </div>
              ) : (
                <div
                  key={m.id}
                  className={cn(
                    'max-w-[460px] self-end rounded-[20px] rounded-br-md bg-hover px-4 py-2.5 text-[15px]',
                    A_POP,
                  )}
                >
                  {m.text}
                </div>
              ),
            )}

            {error && (
              <p role="alert" className="m-0 text-sm text-bad">
                {error}
              </p>
            )}

            {capTurn.isPending && (
              <div className="flex items-start gap-3">
                <CapAvatar />
                <div
                  className="flex gap-1.5 rounded-[4px_16px_16px_16px] bg-hover px-4 py-4"
                  role="status"
                  aria-label="Cap is typing"
                >
                  {[0, 0.15, 0.3].map((d) => (
                    <span
                      key={d}
                      style={{ animationDelay: `${d}s` }}
                      className="size-[7px] animate-typ rounded-full bg-muted motion-reduce:animate-none"
                    />
                  ))}
                </div>
              </div>
            )}

            {retry && (
              <div className="flex flex-wrap items-center gap-2.5">
                <p role="alert" className="m-0 text-sm text-bad">
                  Cap could not answer just now. You can also edit your profile on the right.
                </p>
                <button
                  type="button"
                  className={chip}
                  onClick={() => void turn(draft, resolved, retry.history, retry.text)}
                >
                  Try again
                </button>
              </div>
            )}

            {suggestions.length > 0 && !capTurn.isPending && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick replies">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" className={chip} onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottom} />
          </div>

          <form
            className="px-8 pt-2.5 pb-5"
            onSubmit={(event) => {
              event.preventDefault();
              send(text);
            }}
          >
            <div className="flex h-[50px] items-center gap-2.5 rounded-full border border-line bg-panel pr-2 pl-[18px] focus-within:border-line-2">
              <input
                aria-label="Message Cap"
                disabled={stage !== 'asking'}
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={1000}
                placeholder={
                  stage === 'asking' ? 'Answer in your own words, or ask me anything…' : 'Drop your CV to start'
                }
                className="min-w-0 grow border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={!text.trim() || stage !== 'asking' || capTurn.isPending}
                className="grid size-9 place-items-center rounded-full border-0 bg-pri text-on-pri disabled:opacity-40"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>
        </section>

        <ProfilePanel
          draft={draft}
          hasDraft={hasDraft}
          jobsLinedUp={jobs}
          resolvedPhone={resolved.has('phone')}
          onEdit={(patch) =>
            setDraft((d) => ({
              ...d,
              personal: { ...d.personal, ...patch },
              // A value the owner typed themselves is no longer "unsure".
              flagged: d.flagged.filter(
                (k) =>
                  !(
                    (k === 'name' && ('firstName' in patch || 'lastName' in patch)) ||
                    (k === 'email' && 'email' in patch) ||
                    (k === 'phone' && 'phone' in patch)
                  ),
              ),
            }))
          }
          footer={footer}
        />
      </main>

      {addJobs && (
        <AddJobsDialog
          initialText=""
          onClose={() => setAddJobs(false)}
          onAdded={async (ids) => {
            setAddJobs(false);
            setJobs((n) => n + ids.length);
            if (ids.length)
              push('cap', `Lined up ${ids.length}. Nothing starts until you press Start, and you approve every form.`);
          }}
        />
      )}
    </>
  );
}
