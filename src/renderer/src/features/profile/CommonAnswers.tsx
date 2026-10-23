import { readProfileData } from './profileStorage';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Card, Field, FieldGrid, Input, Select, Textarea } from '../../components/ui';
import { PButton } from './buttons';
import { CountryBadge, Glyph } from './icons';
import { ProfileEditor } from './ProfileEditor';
import {
  ANSWERS_V2_KEY,
  answerFor,
  answerMarkets,
  answerSummary,
  AUTHORIZATION_QUESTION,
  SALARY_QUESTION,
  authorizationAnswer,
  hasOverride,
  readAnswersV2,
  resolveSalary,
  START_QUESTION,
  startAnswer,
  type Answer,
  type AnswerMarket,
} from './answers';
import { MARKETS_KEY, countryName, readMarkets, type Market } from './markets';
import {
  EMPTY_PROFILE,
  OPEN_EDITOR_EVENT,
  PROFILE_KEY,
  readProfile,
  type OpenEditorDetail,
  type PersonalProfile,
} from './personal';
import { useLiveRead } from './useLiveRead';
import { hintText, monoLabel, sectionTitle } from './styles';
import { useSavedDraft } from './useSavedDraft';

const readAnswersWithMigration = (raw: string | null) => readAnswersV2(raw);

function readLiveProfile(): PersonalProfile {
  try {
    return readProfile(readProfileData(PROFILE_KEY));
  } catch {
    return { ...EMPTY_PROFILE, career: [] };
  }
}
function readLiveMarkets(): Market[] {
  try {
    return readMarkets(readProfileData(MARKETS_KEY));
  } catch {
    return [];
  }
}

const answerList = 'grid grid-cols-2 gap-x-7 [@media(width<=800px)]:grid-cols-1';
const answerRow = 'flex min-w-0 items-center justify-between gap-3 border-t border-line py-3';
const answerQuestion = 'text-[13px] leading-[1.5] font-semibold';
const overrideRow = 'grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3';
const autoTag =
  'ml-1.5 rounded-[5px] border border-line-2 px-1.5 py-px align-middle font-mono text-[9.5px] leading-[normal] font-medium tracking-[0.06em] text-muted uppercase';

const openEditor = (detail: OpenEditorDetail) => window.dispatchEvent(new CustomEvent(OPEN_EDITOR_EVENT, { detail }));
const nameOf = (code: string) => countryName(code) ?? code;

/** "All · US · MA …" as code badges (never emoji flags). A radio group with arrow-key navigation. */
function MarketSwitch({
  markets,
  scope,
  onScope,
}: {
  markets: readonly AnswerMarket[];
  scope: string;
  onScope: (next: string) => void;
}) {
  const ids = ['all', ...markets.map((m) => m.code)];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (e: KeyboardEvent, index: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = ids[(index + step + ids.length) % ids.length]!;
    onScope(next);
    refs.current[next]?.focus();
  };
  return (
    <div
      className="mb-3.5 inline-flex items-center gap-0.5 self-start rounded-full border border-line bg-panel p-[3px]"
      role="radiogroup"
      aria-label="Show answers for"
    >
      {ids.map((id, i) => {
        const market = markets.find((m) => m.code === id);
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={scope === id}
            aria-label={market ? `${market.name}${market.home ? ' (home)' : ''}` : 'All countries'}
            title={market ? `${market.name}${market.home ? ' · your country' : ''}` : undefined}
            tabIndex={scope === id ? 0 : -1}
            className="group inline-flex min-h-8 items-center rounded-full bg-transparent px-3 text-[13px]! font-semibold! text-muted! aria-checked:bg-pri aria-checked:text-on-pri!"
            onClick={() => onScope(id)}
            onKeyDown={(e) => move(e, i)}
          >
            {market ? (
              <CountryBadge
                code={market.code}
                name={market.name}
                className="group-aria-checked:border-current group-aria-checked:bg-transparent group-aria-checked:text-inherit"
              />
            ) : (
              'All'
            )}
          </button>
        );
      })}
    </div>
  );
}

interface LineData {
  code?: string;
  text: string;
  /** A warning-coloured button after the text, for a value that is missing. */
  action?: { label: string; onClick: () => void };
}

function Lines({ lines }: { lines: LineData[] }) {
  return (
    <div className="mt-1 flex flex-col gap-1">
      {lines.map((l, i) => (
        <div
          className="flex items-baseline gap-2 text-[12.5px] leading-[1.5] [overflow-wrap:anywhere] whitespace-pre-wrap text-ink-2"
          key={`${l.code ?? 'main'}-${i}`}
        >
          {l.code && <CountryBadge code={l.code} name={nameOf(l.code)} className="mt-0.5 self-start" />}
          <span className={l.text ? (l.action ? 'text-need' : '') : 'text-muted'}>{l.text || 'No answer saved'}</span>
          {l.action && (
            <button
              type="button"
              className="min-h-6 flex-none rounded-full border border-need-line bg-need-tint px-2.5 [font-size:12px]! leading-[normal]! font-semibold! text-need! hover:brightness-[0.97]"
              onClick={l.action.onClick}
            >
              {l.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function PencilButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <PButton variant="ghost" className="w-9 min-w-9 flex-none px-0!" aria-label={label} onClick={onClick}>
      <Glyph name="pencil" size={15} />
    </PButton>
  );
}

export function CommonAnswers() {
  const store = useSavedDraft(ANSWERS_V2_KEY, readAnswersWithMigration);
  const profile = useLiveRead(readLiveProfile);
  const storedMarkets = useLiveRead(readLiveMarkets);
  const markets = useMemo(() => answerMarkets(profile, storedMarkets), [profile, storedMarkets]);
  const [scopeChoice, setScope] = useState('all');
  const scope = markets.some((m) => m.code === scopeChoice) ? scopeChoice : 'all';
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const { draft, setDraft } = store;
  const current = draft.find((a) => a.id === editing);
  const q = query.toLowerCase();
  const shown = draft.filter((a) =>
    `${a.question} ${a.default} ${Object.values(a.overrides).join(' ')}`.toLowerCase().includes(q),
  );
  const visibleMarkets = scope === 'all' ? markets : markets.filter((m) => m.code === scope);
  const free = (a: Answer) => markets.filter((m) => !(m.code in a.overrides));
  const patch = (id: string, change: Partial<Answer>) =>
    setDraft((all) => all.map((a) => (a.id === id ? { ...a, ...change } : a)));
  const close = () => {
    store.cancel();
    setEditing(null);
  };
  /** Empty override texts are dropped: an override only exists when it says something. */
  const cleaned = (all: Answer[]): Answer[] =>
    all.map((a) => ({
      ...a,
      overrides: Object.fromEntries(Object.entries(a.overrides).filter(([, text]) => text.trim())),
    }));
  const startOverride = (a: Answer) => {
    const first = free(a)[0];
    if (first) patch(a.id, { overrides: { ...a.overrides, [first.code]: '' } });
    setEditing(a.id);
  };
  const summary = answerSummary(draft, markets, profile);
  const openMarket = (m: AnswerMarket) =>
    m.home && !storedMarkets.some((s) => s.code === m.code)
      ? openEditor({ kind: 'profile', group: 'preferences' })
      : openEditor({ kind: 'market', code: m.code });
  // An amount is never reused across currencies: a country without a figure in its own currency says so.
  const salaryLines: LineData[] = (visibleMarkets.length ? visibleMarkets : [undefined]).map((m) => {
    const r = resolveSalary(profile, m);
    if (r.status === 'set') return { code: m?.code, text: r.text };
    return {
      code: m?.code,
      text: `Not set: add an amount${r.currency ? ` in ${r.currency}` : ''}`,
      action: {
        label: 'Set amount',
        onClick: () => (m ? openMarket(m) : openEditor({ kind: 'profile', group: 'preferences' })),
      },
    };
  });
  const start = startAnswer(profile);
  return (
    <Card
      role="region"
      className="scroll-mt-6 px-[22px] py-[18px] [@media(width<=1190px)]:p-[18px]"
      id="common-answers"
      aria-labelledby="answers-title"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 id="answers-title" className={`${sectionTitle} leading-[1.4]`}>
            Common answers{' '}
            <span className="ml-1.5 font-mono text-[11px] leading-[normal] font-normal text-muted">
              {summary.answered}
            </span>
          </h2>
          <p className="mt-[3px] text-[12.5px] leading-[1.5] text-muted">
            Write an answer once. Give a country its own wording only where it differs.
          </p>
        </div>
        <PButton
          className="min-h-[30px]! gap-1.5! text-[12.5px]!"
          onClick={() => {
            const id = crypto.randomUUID();
            setDraft((all) => [...all, { id, question: '', default: '', overrides: {} }]);
            setEditing(id);
          }}
        >
          <Glyph name="plus" size={14} /> Add answer
        </PButton>
      </div>
      {markets.length > 0 ? (
        <MarketSwitch markets={markets} scope={scope} onScope={setScope} />
      ) : (
        <p className={hintText}>Add countries in Where you apply to give each one its own answers.</p>
      )}
      <label className="mb-4 flex w-full max-w-[340px] items-center gap-2 rounded-full border border-line px-3 py-[7px] text-muted focus-within:outline-2 focus-within:outline-solid focus-within:outline-ink focus-within:outline-offset-2">
        <Glyph name="search" />
        <span className="sr-only">Search common answers</span>
        <input
          type="search"
          className="w-full min-w-0 border-0 bg-transparent font-sans text-[12.5px] leading-[normal] text-ink outline-none!"
          placeholder="Search saved answers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="mb-[18px]">
        <div className="mb-1 flex items-baseline gap-3">
          <span className={monoLabel}>Auto</span>
          <span className="[font-size:12px] text-muted">
            Filled from Where you apply and Job preferences. Edit them there, never twice.
          </span>
        </div>
        <div className={answerList}>
          {markets.length > 0 && (
            <div className={answerRow}>
              <div className="min-w-0">
                <strong className={answerQuestion}>
                  {AUTHORIZATION_QUESTION} <span className={autoTag}>auto</span>
                </strong>
                <Lines lines={visibleMarkets.map((m) => ({ code: m.code, text: authorizationAnswer(m.workAuth) }))} />
              </div>
              <PencilButton
                label={
                  visibleMarkets.length === 1
                    ? `Edit work authorization for ${visibleMarkets[0]!.name}`
                    : 'Edit work authorization by country'
                }
                onClick={() => {
                  const only = visibleMarkets.length === 1 ? visibleMarkets[0]! : undefined;
                  if (!only) openEditor({ kind: 'manage' });
                  else if (only.home && !storedMarkets.some((s) => s.code === only.code))
                    openEditor({ kind: 'profile', group: 'contact' });
                  else openEditor({ kind: 'market', code: only.code });
                }}
              />
            </div>
          )}
          <div className={answerRow}>
            <div className="min-w-0">
              <strong className={answerQuestion}>
                {SALARY_QUESTION} <span className={autoTag}>auto</span>
              </strong>
              <Lines lines={salaryLines} />
            </div>
            <PencilButton
              label={
                visibleMarkets.length === 1
                  ? `Edit salary for ${visibleMarkets[0]!.name}`
                  : 'Edit salary in job preferences'
              }
              onClick={() =>
                visibleMarkets.length === 1
                  ? openMarket(visibleMarkets[0]!)
                  : openEditor({ kind: 'profile', group: 'preferences' })
              }
            />
          </div>
          <div className={answerRow}>
            <div className="min-w-0">
              <strong className={answerQuestion}>
                {START_QUESTION} <span className={autoTag}>auto</span>
              </strong>
              <Lines
                lines={[
                  start
                    ? { text: start }
                    : {
                        text: 'Not set: add your notice',
                        action: {
                          label: 'Set notice',
                          onClick: () => openEditor({ kind: 'profile', group: 'preferences' }),
                        },
                      },
                ]}
              />
            </div>
            <PencilButton
              label="Edit notice in job preferences"
              onClick={() => openEditor({ kind: 'profile', group: 'preferences' })}
            />
          </div>
        </div>
      </div>

      <div className={answerList}>
        {shown.map((a) => {
          const hit = scope !== 'all' && hasOverride(a, scope);
          return (
            <div className={answerRow} key={a.id}>
              <div className="min-w-0">
                <strong className={answerQuestion}>{a.question || 'New question'}</strong>
                {scope === 'all' ? (
                  <Lines
                    lines={[
                      { text: a.default },
                      ...Object.entries(a.overrides).map(([code, text]) => ({ code, text })),
                    ]}
                  />
                ) : (
                  <Lines lines={[{ code: hit ? scope : undefined, text: answerFor(a, scope) }]} />
                )}
                <button
                  type="button"
                  className="mt-1.5 self-start bg-transparent p-0 disabled:cursor-not-allowed! disabled:text-muted!"
                  disabled={!free(a).length}
                  title={free(a).length ? undefined : 'Every country already has its own answer, or none is set up yet'}
                  onClick={() => startOverride(a)}
                >
                  + Different answer for a country
                </button>
              </div>
              <PencilButton label={`Edit answer: ${a.question}`} onClick={() => setEditing(a.id)} />
            </div>
          );
        })}
      </div>
      {!shown.length && (
        <p className="text-[13.5px] text-muted">{query ? 'No matching answers.' : 'Add your first answer.'}</p>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-3.5 text-[11.5px] text-muted">
        <span>
          {summary.answered} answered · {summary.total} questions
        </span>
        <span role="status">{store.error || store.message || 'Saved on this device'}</span>
      </div>
      {current && (
        <ProfileEditor
          title="Edit answer"
          description="Keep it in your own words. Countries without their own answer use the default."
          dirty={store.dirty}
          error={store.error}
          onCancel={close}
          onSave={async () => {
            if (await store.save(cleaned(draft))) setEditing(null);
          }}
        >
          <FieldGrid>
            <Field label="Question" wide>
              <Input
                required
                pattern=".*\S.*"
                value={current.question}
                maxLength={500}
                onChange={(e) => patch(current.id, { question: e.target.value })}
              />
            </Field>
            <Field label="Default answer" wide>
              <Textarea
                rows={5}
                value={current.default}
                maxLength={10000}
                placeholder="Your answer…"
                onChange={(e) => patch(current.id, { default: e.target.value })}
              />
            </Field>
          </FieldGrid>
          <div className="mt-6 flex flex-col gap-3.5 border-t border-line pt-[18px]">
            <div className={monoLabel}>Different answers by country</div>
            {Object.entries(current.overrides).map(([code, text]) => (
              <div className={overrideRow} key={code}>
                <Field
                  label={
                    <span className="flex items-center gap-2">
                      <CountryBadge code={code} name={nameOf(code)} /> {nameOf(code)}
                    </span>
                  }
                >
                  <Textarea
                    rows={3}
                    value={text}
                    maxLength={10000}
                    placeholder={`What to answer for ${nameOf(code)}…`}
                    onChange={(e) => patch(current.id, { overrides: { ...current.overrides, [code]: e.target.value } })}
                  />
                </Field>
                <PButton
                  variant="ghost"
                  aria-label={`Remove the ${nameOf(code)} answer`}
                  onClick={() => {
                    patch(current.id, {
                      overrides: Object.fromEntries(Object.entries(current.overrides).filter(([c]) => c !== code)),
                    });
                  }}
                >
                  Remove
                </PButton>
              </div>
            ))}
            <OverrideAdder
              options={free(current)}
              onAdd={(code) => patch(current.id, { overrides: { ...current.overrides, [code]: '' } })}
            />
          </div>
          <PButton
            variant="danger"
            className="mt-6"
            onClick={async () => {
              if (await store.save(cleaned(draft.filter((a) => a.id !== current.id)))) setEditing(null);
            }}
          >
            Remove question
          </PButton>
        </ProfileEditor>
      )}
    </Card>
  );
}

/** Adds an override for one of the configured markets (never an arbitrary country). */
function OverrideAdder({ options, onAdd }: { options: readonly AnswerMarket[]; onAdd: (code: string) => void }) {
  const [pick, setPick] = useState('');
  if (!options.length) return <p className={hintText}>Every country you apply in already has its own answer.</p>;
  const value = options.some((o) => o.code === pick) ? pick : options[0]!.code;
  return (
    <div className={overrideRow}>
      <Field label="Add a country">
        <Select className="[&>svg]:text-[#8c8c8c]" value={value} onChange={(e) => setPick(e.target.value)}>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </Select>
      </Field>
      <PButton className="gap-1.5!" onClick={() => onAdd(value)}>
        <Glyph name="plus" size={14} /> Add
      </PButton>
    </div>
  );
}
