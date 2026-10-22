import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
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
  ANSWERS_KEY,
  EMPTY_PROFILE,
  OPEN_EDITOR_EVENT,
  PROFILE_KEY,
  readProfile,
  type OpenEditorDetail,
  type PersonalProfile,
} from './personal';
import { useLiveRead } from './useLiveRead';
import { useSavedDraft } from './useSavedDraft';

const readAnswersWithMigration = (raw: string | null) => readAnswersV2(raw, localStorage.getItem(ANSWERS_KEY));

function readLiveProfile(): PersonalProfile {
  try {
    return readProfile(localStorage.getItem(PROFILE_KEY));
  } catch {
    return { ...EMPTY_PROFILE, career: [] };
  }
}
function readLiveMarkets(): Market[] {
  try {
    return readMarkets(localStorage.getItem(MARKETS_KEY));
  } catch {
    return [];
  }
}

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
    <div className="pf-scope" role="radiogroup" aria-label="Show answers for">
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
            className="pf-scope-opt"
            onClick={() => onScope(id)}
            onKeyDown={(e) => move(e, i)}
          >
            {market ? <CountryBadge code={market.code} name={market.name} /> : 'All'}
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
    <div className="pf-lines">
      {lines.map((l, i) => (
        <div className="pf-line" key={`${l.code ?? 'main'}-${i}`}>
          {l.code && <CountryBadge code={l.code} name={nameOf(l.code)} />}
          <span className={l.text ? (l.action ? 'pf-warn' : '') : 'profile-missing'}>
            {l.text || 'No answer saved'}
          </span>
          {l.action && (
            <button type="button" className="pf-warnbtn" onClick={l.action.onClick}>
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
    <button className="btn sm ghost ic" type="button" aria-label={label} onClick={onClick}>
      <Glyph name="pencil" size={15} />
    </button>
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
    <section className="profile-card profile-questions" id="common-answers" aria-labelledby="answers-title">
      <div className="profile-card-heading">
        <div>
          <h2 id="answers-title">
            Common answers <span className="profile-question-count">{summary.answered}</span>
          </h2>
          <p>Write an answer once. Give a country its own wording only where it differs.</p>
        </div>
        <button
          className="btn sm"
          type="button"
          onClick={() => {
            const id = crypto.randomUUID();
            setDraft((all) => [...all, { id, question: '', default: '', overrides: {} }]);
            setEditing(id);
          }}
        >
          <Glyph name="plus" size={14} /> Add answer
        </button>
      </div>
      {markets.length > 0 ? (
        <MarketSwitch markets={markets} scope={scope} onScope={setScope} />
      ) : (
        <p className="pf-hint">Add countries in Where you apply to give each one its own answers.</p>
      )}
      <label className="profile-search">
        <Glyph name="search" />
        <span className="sr-only">Search common answers</span>
        <input
          type="search"
          placeholder="Search saved answers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="pf-autogroup">
        <div className="pf-eyebrow-row">
          <span className="v17x">Auto</span>
          <span className="pf-auto-note">Filled from Where you apply and Job preferences. Edit them there, never twice.</span>
        </div>
        <div className="profile-answer-list">
          {markets.length > 0 && (
            <div className="profile-answer-summary">
              <div>
                <strong>
                  {AUTHORIZATION_QUESTION} <span className="pf-autotag">auto</span>
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
          <div className="profile-answer-summary">
            <div>
              <strong>
                {SALARY_QUESTION} <span className="pf-autotag">auto</span>
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
          <div className="profile-answer-summary">
            <div>
              <strong>
                {START_QUESTION} <span className="pf-autotag">auto</span>
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

      <div className="profile-answer-list">
        {shown.map((a) => {
          const hit = scope !== 'all' && hasOverride(a, scope);
          return (
            <div className="profile-answer-summary" key={a.id}>
              <div>
                <strong>{a.question || 'New question'}</strong>
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
                  className="pf-addlink pf-diff"
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
      {!shown.length && <p className="s">{query ? 'No matching answers.' : 'Add your first answer.'}</p>}
      <div className="profile-answers-meta">
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
          onSave={() => {
            if (store.save(cleaned(draft))) setEditing(null);
          }}
        >
          <div className="profile-fields">
            <label className="profile-field profile-wide">
              <span>Question</span>
              <input
                required
                pattern=".*\S.*"
                value={current.question}
                maxLength={500}
                onChange={(e) => patch(current.id, { question: e.target.value })}
              />
            </label>
            <label className="profile-field profile-wide">
              <span>Default answer</span>
              <textarea
                rows={5}
                value={current.default}
                maxLength={10000}
                placeholder="Your answer…"
                onChange={(e) => patch(current.id, { default: e.target.value })}
              />
            </label>
          </div>
          <div className="pf-overrides">
            <div className="v17x">Different answers by country</div>
            {Object.entries(current.overrides).map(([code, text]) => (
              <div className="pf-override" key={code}>
                <label className="profile-field">
                  <span className="pf-ovlabel">
                    <CountryBadge code={code} name={nameOf(code)} /> {nameOf(code)}
                  </span>
                  <textarea
                    rows={3}
                    value={text}
                    maxLength={10000}
                    placeholder={`What to answer for ${nameOf(code)}…`}
                    onChange={(e) => patch(current.id, { overrides: { ...current.overrides, [code]: e.target.value } })}
                  />
                </label>
                <button
                  type="button"
                  className="btn sm ghost"
                  aria-label={`Remove the ${nameOf(code)} answer`}
                  onClick={() => {
                    patch(current.id, {
                      overrides: Object.fromEntries(Object.entries(current.overrides).filter(([c]) => c !== code)),
                    });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <OverrideAdder
              options={free(current)}
              onAdd={(code) => patch(current.id, { overrides: { ...current.overrides, [code]: '' } })}
            />
          </div>
          <button
            className="btn sm neg profile-delete-answer"
            type="button"
            onClick={() => {
              if (store.save(cleaned(draft.filter((a) => a.id !== current.id)))) setEditing(null);
            }}
          >
            Remove question
          </button>
        </ProfileEditor>
      )}
    </section>
  );
}

/** Adds an override for one of the configured markets (never an arbitrary country). */
function OverrideAdder({ options, onAdd }: { options: readonly AnswerMarket[]; onAdd: (code: string) => void }) {
  const [pick, setPick] = useState('');
  if (!options.length) return <p className="pf-hint">Every country you apply in already has its own answer.</p>;
  const value = options.some((o) => o.code === pick) ? pick : options[0]!.code;
  return (
    <div className="pf-override-add">
      <label className="profile-field">
        <span>Add a country</span>
        <select value={value} onChange={(e) => setPick(e.target.value)}>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn sm" onClick={() => onAdd(value)}>
        <Glyph name="plus" size={14} /> Add
      </button>
    </div>
  );
}
