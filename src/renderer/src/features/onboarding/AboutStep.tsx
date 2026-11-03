import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileSaveSchema } from '../../../../shared/dto';
import { Button, cn } from '../../components/ui';
import { saveProfile, useCapTurn, useExtractCv } from '../../lib/api';
import { usePrefersReducedMotion } from '../../lib/motion';
import { AddJobsDialog } from '../dashboard/addjobs/AddJobsDialog';
import { documentStore, type ProfileDocument } from '../profile/documents';
import { AddCountryDialog } from '../profile/MarketDialogs';
import { LEVELS, languageName } from '../profile/languages';
import { COUNTRIES, EU_MARKET, countryName } from '../profile/markets';
import { documentContentError, documentError } from '../profile/personal';
import { DOCUMENTS_CHANGED } from '../profile/useDocumentCount';
import { setProfileData } from '../profile/profileStorage';
import { A_POP, A_RISE, BUBBLE, REDUCE_ALL } from '../shared-ui';
import {
  EMPTY_DRAFT,
  applyFacts,
  draftFromExtraction,
  nextAsk,
  requiredLeft,
  setLanguageLevel,
  setRight,
  toSaves,
  toggleMarket,
  type Ask,
  type Draft,
} from './draft';
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

const TYPING_MS = 900;
const chip =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-2 bg-transparent px-3.5 text-sm text-ink hover:bg-hover aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const CARD = cn('flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5', A_POP);

const askKey = (ask: Ask): string =>
  ask.kind === 'language' ? `lang:${ask.id}` : ask.kind === 'rights' ? `rights:${ask.code}` : ask.kind;

const nameOfLanguage = (code: string) => languageName(code);

/** P2 About you: drop the CV, Cap reads it and asks only what it was unsure of, the profile builds live on the right. */
export function AboutStep() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const extract = useExtractCv();
  const capTurn = useCapTurn();
  const [stage, setStage] = useState<Stage>('drop');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hasDraft, setHasDraft] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [log, setLog] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [resolved, setResolved] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState<string | null>(null);
  const [offered, setOffered] = useState<string[]>([]);
  const [addCountry, setAddCountry] = useState(false);
  const [addJobs, setAddJobs] = useState(false);
  const [jobs, setJobs] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null);
  const seq = useRef(0);
  const alive = useRef(true);
  const announcing = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const push = useCallback((from: Msg['from'], body: string) => {
    setLog((items) => [...items, { id: seq.current++, from, text: body }]);
  }, []);
  /** Cap types for a moment, then speaks. The delay never hides a slow AI: it only runs once a reply is in hand. */
  const say = useCallback(
    (body: string) =>
      new Promise<void>((resolve) => {
        setTyping(true);
        setTimeout(
          () => {
            if (!alive.current) return resolve();
            setTyping(false);
            push('cap', body);
            resolve();
          },
          reduced ? 0 : TYPING_MS,
        );
      }),
    [push, reduced],
  );

  // Intro line once.
  useEffect(() => {
    push('cap', 'Now you. Drop your CV and watch: I fill your profile while I read.');
  }, [push]);

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' });
  }, [log, typing, shown]);

  const ask = stage === 'asking' ? nextAsk(draft, resolved, nameOfLanguage) : null;
  const key = ask ? askKey(ask) : null;

  const prompt = useCallback(
    (a: Ask): string => {
      switch (a.kind) {
        case 'phone':
          return `I read your phone as ${draft.personal.phone}. Does that country code look right?`;
        case 'language':
          return `How well do you speak ${a.name}?`;
        case 'markets':
          return 'Where do you want to work? I guessed from your CV. Tap to change.';
        case 'rights': {
          const nationality = draft.nationalities.map((c) => countryName(c) ?? c).join(' and ');
          return `${nationality ? `Your CV says ${nationality}. ` : ''}Can you work in ${countryName(a.code) ?? a.code} without a visa?`;
        }
        case 'jobs':
          return 'That’s all I need. Salary and notice I ask only when a form wants them. Last, optional: paste jobs you want.';
      }
    },
    [draft.nationalities, draft.personal.phone],
  );

  // Announce each new question once; the card appears after Cap has "typed" it.
  useEffect(() => {
    if (!ask || !key || shown === key || announcing.current === key) return;
    announcing.current = key;
    void say(prompt(ask)).then(() => alive.current && setShown(key));
  }, [ask, key, shown, say, prompt]);

  const resolve = (k: string) => setResolved((current) => new Set(current).add(k));

  const readCv = async (picked: File | undefined) => {
    if (!picked || stage !== 'drop') return;
    setError('');
    const problem = documentError(picked) ?? (await documentContentError(picked));
    if (problem) return setError(problem);
    setFile(picked);
    setStage('reading');
    const started = Date.now();
    try {
      const x = await extract.mutateAsync({ name: picked.name, bytes: new Uint8Array(await picked.arrayBuffer()) });
      if (!alive.current) return;
      const next = draftFromExtraction(x);
      setDraft(next);
      setHasDraft(true);
      setOffered(next.markets.map((m) => m.code));
      setStage('asking');
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
      await say(
        `Read in ${seconds} s. Everything’s on the right. ${nextAsk(next, new Set(), nameOfLanguage) ? 'A few things I wasn’t sure about:' : ''}`.trim(),
      );
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

  const answer = (k: string, mine: string, change?: (d: Draft) => Draft) => {
    push('me', mine);
    resolve(k);
    if (change) setDraft(change);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !ask || typing || capTurn.isPending) return;
    setText('');
    push('me', body);
    try {
      const turn = await capTurn.mutateAsync({ question: prompt(ask).slice(0, 300), text: body });
      setDraft((d) => applyFacts(d, turn.facts));
      setOffered((o) => [
        ...new Set([...o, ...turn.facts.flatMap((f) => (f.kind === 'market' ? [f.code.toUpperCase()] : []))]),
      ]);
      if (ask.kind === 'markets' && turn.facts.some((f) => f.kind === 'market')) resolve('markets');
      await say(turn.reply);
    } catch (cause) {
      await say(
        cause instanceof Error && cause.message
          ? cause.message
          : 'I couldn’t read that just now. Tap one of the options.',
      );
    }
  };

  const left = useMemo(() => requiredLeft(draft, resolved, nameOfLanguage), [draft, resolved]);
  const phoneResolved = resolved.has('phone');

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

  const marketCodes = [...new Set([...offered, ...draft.markets.map((m) => m.code)])];
  const showCard = key !== null && shown === key && !typing;

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
            : `${left} quick answer${left === 1 ? '' : 's'} left`}
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
              <span className="text-[12.5px] text-brand-text">Tap an answer or type your own</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void navigate(stepPath(1))}>
              ← Back
            </Button>
          </div>

          <div aria-live="polite" className="flex min-h-0 grow flex-col justify-end gap-3 overflow-y-auto px-8 py-5">
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
                      PDF or DOCX · any language · read by your own AI, on this computer
                    </span>
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx"
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

            {error && (
              <p role="alert" className="m-0 text-sm text-bad">
                {error}
              </p>
            )}

            {typing && (
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

            {showCard && ask && (
              <div className={CARD} role="group" aria-label="Cap’s question">
                {ask.kind === 'phone' && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {phoneEdit === null ? (
                      <>
                        <button
                          type="button"
                          className={chip}
                          aria-pressed="true"
                          onClick={() => answer('phone', `Yes, ${draft.personal.phone}`)}
                        >
                          {draft.personal.phone} looks right
                        </button>
                        <button type="button" className={chip} onClick={() => setPhoneEdit(draft.personal.phone)}>
                          Change
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-muted">
                        Edit the number in your profile on the right, then press Enter.
                      </span>
                    )}
                  </div>
                )}
                {ask.kind === 'language' && (
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={chip}
                        onClick={() =>
                          answer(`lang:${ask.id}`, `${ask.name}: ${level}`, (d) => setLanguageLevel(d, ask.id, level))
                        }
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
                {ask.kind === 'markets' && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {marketCodes.map((code) => {
                        const on = draft.markets.some((m) => m.code === code);
                        return (
                          <button
                            key={code}
                            type="button"
                            className={chip}
                            aria-pressed={on}
                            onClick={() => setDraft((d) => toggleMarket(d, code))}
                          >
                            <span className="font-mono text-[11px] text-muted">{code}</span>
                            {countryName(code) ?? (code === EU_MARKET.code ? EU_MARKET.name : code)}
                          </button>
                        );
                      })}
                      <button type="button" className={cn(chip, 'text-muted')} onClick={() => setAddCountry(true)}>
                        + Another country
                      </button>
                    </div>
                    <div>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={draft.markets.length === 0}
                        onClick={() =>
                          answer('markets', draft.markets.map((m) => countryName(m.code) ?? m.code).join(', '))
                        }
                        className={PRESS}
                      >
                        That’s it
                      </Button>
                    </div>
                  </>
                )}
                {ask.kind === 'rights' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={chip}
                      onClick={() =>
                        answer(`rights:${ask.code}`, 'Yes, I can work there', (d) =>
                          setRight(d, ask.code, 'authorized'),
                        )
                      }
                    >
                      Yes, I can work there
                    </button>
                    <button
                      type="button"
                      className={chip}
                      onClick={() =>
                        answer(`rights:${ask.code}`, 'No, I’d need sponsorship', (d) =>
                          setRight(d, ask.code, 'sponsorship'),
                        )
                      }
                    >
                      No, I’d need sponsorship
                    </button>
                    <button
                      type="button"
                      className={cn(chip, 'border-transparent text-muted')}
                      onClick={() => {
                        setText('I also hold a passport from ');
                        input.current?.focus();
                      }}
                    >
                      + I hold another passport
                    </button>
                  </div>
                )}
                {ask.kind === 'jobs' && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button type="button" className={chip} aria-pressed="true" onClick={() => setAddJobs(true)}>
                      Paste job links
                    </button>
                    <button type="button" className={chip} onClick={() => answer('jobs', 'Later')}>
                      Later
                    </button>
                    <span className="text-[13px] text-muted">One link or many</span>
                  </div>
                )}
              </div>
            )}
            <div ref={bottom} />
          </div>

          <form
            className="px-8 pt-2.5 pb-5"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="flex h-[50px] items-center gap-2.5 rounded-full border border-line bg-panel pr-2 pl-[18px] focus-within:border-line-2">
              <input
                ref={input}
                aria-label="Message Cap"
                disabled={!ask || !showCard}
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
                disabled={!text.trim() || !showCard || capTurn.isPending}
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
          resolvedPhone={phoneResolved}
          onEdit={(patch) => {
            setDraft((d) => ({ ...d, personal: { ...d.personal, ...patch } }));
            if (phoneEdit !== null && 'phone' in patch) {
              setPhoneEdit(null);
              answer('phone', `Phone: ${patch.phone}`);
            }
          }}
          footer={footer}
        />
      </main>

      {addCountry && (
        <AddCountryDialog
          existing={marketCodes}
          onCancel={() => setAddCountry(false)}
          onAdd={(code) => {
            setAddCountry(false);
            if (!COUNTRIES.some((c) => c.code === code) && code !== EU_MARKET.code) return;
            setOffered((o) => [...new Set([...o, code])]);
            setDraft((d) => (d.markets.some((m) => m.code === code) ? d : toggleMarket(d, code)));
          }}
        />
      )}
      {addJobs && (
        <AddJobsDialog
          initialText=""
          onClose={() => {
            setAddJobs(false);
          }}
          onAdded={async (ids) => {
            setAddJobs(false);
            setJobs((n) => n + ids.length);
            answer('jobs', `${ids.length} job link${ids.length === 1 ? '' : 's'}`);
            await say(
              ids.length
                ? `Lined up ${ids.length}. Nothing starts until you press Start, and you approve every form.`
                : 'No problem. Paste links any time from your dashboard.',
            );
          }}
        />
      )}
    </>
  );
}
