import { useId, useMemo, useState } from 'react';
import { SegmentedChoice } from '../../components/SegmentedChoice';
import { Glyph, CountryBadge } from './icons';
import { ProfileEditor } from './ProfileEditor';
import {
  COUNTRIES,
  CURRENCIES,
  CV_LANGUAGES,
  EU_MARKET,
  countryName,
  isEuMember,
  marketSummary,
  type Market,
  type WorkAuth,
} from './markets';
import { effectiveSalaryCurrency, type PersonalProfile } from './personal';
import { SalaryField } from './ProfileInputs';
import type { SalaryPeriod } from './salary';
import { parsePhone } from './phones';

/** "+212 6 12 34 56 78 · Mobile", the same international format as the Contact card. */
function phoneLabel(stored: string): string {
  const info = parsePhone(stored);
  return [info.international ?? info.raw, info.type && info.type.charAt(0) + info.type.slice(1).toLowerCase()]
    .filter(Boolean)
    .join(' · ');
}

const nameOf = (code: string) => countryName(code) ?? code;
const SHORT_NAMES: Record<string, string> = { US: 'the US', GB: 'the UK', AE: 'the UAE', EU: 'the European Union' };
const withArticle = (code: string, name: string) =>
  SHORT_NAMES[code] ?? (/^Netherlands$/.test(name) ? `the ${name}` : name);

/** The phones a country can use: the profile's own numbers, de-duplicated. */
export function profilePhones(profile: Pick<PersonalProfile, 'phone' | 'alternatePhone'>): string[] {
  return [...new Set([profile.phone, profile.alternatePhone].map((p) => p.trim()).filter(Boolean))];
}

/** Drops empty optional fields so "empty" always means "use the main details". */
function normalise(m: Market): Market {
  const next: Market = { code: m.code, workAuth: m.workAuth };
  if (m.phone) next.phone = m.phone;
  if (m.currency) next.currency = m.currency;
  if (m.cvLanguage) next.cvLanguage = m.cvLanguage;
  if (m.photo) next.photo = true;
  if (m.salary) next.salary = m.salary;
  return next;
}

const AUTH_OPTIONS = [
  { value: 'authorized', label: 'Yes' },
  { value: 'sponsorship', label: 'I need a visa' },
] as const;
const PHOTO_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
] as const;

export function CountryEditor({
  market,
  profile,
  error,
  added = false,
  onSave,
  onRemove,
  onCancel,
}: {
  market: Market;
  profile: PersonalProfile;
  error: string;
  /** Just created from "Add a country": explain that nothing differs yet. */
  added?: boolean;
  onSave: (next: Market) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Market>(market);
  const [period, setPeriod] = useState<SalaryPeriod>(market.salary?.period ?? 'year');
  const name = nameOf(market.code);
  const phones = profilePhones(profile);
  const stalePhone = draft.phone && !phones.includes(draft.phone) ? draft.phone : null;
  const staleLanguage = draft.cvLanguage && !CV_LANGUAGES.includes(draft.cvLanguage) ? draft.cvLanguage : null;
  const staleCurrency = draft.currency && !CURRENCIES.some((c) => c.code === draft.currency) ? draft.currency : null;
  const dirty = JSON.stringify(normalise(draft)) !== JSON.stringify(normalise(market));
  const set = (patch: Partial<Market>) => setDraft((d) => ({ ...d, ...patch }));
  const authLabelId = useId();
  return (
    <ProfileEditor
      eyebrow="Where you apply"
      title={name}
      titleAdornment={<CountryBadge code={market.code} name={name} />}
      description={`What the agent sends for jobs in ${withArticle(market.code, name)}.`}
      dirty={dirty}
      error={error}
      note={
        added ? 'Added. Change anything that differs from your main details.' : 'Empty fields use your main details.'
      }
      saveLabel="Save"
      onCancel={onCancel}
      onSave={() => onSave(normalise(draft))}
    >
      <div className="profile-fields">
        <div className="profile-field profile-wide" role="group" aria-labelledby={authLabelId}>
          <span id={authLabelId}>Can you work there?</span>
          <SegmentedChoice<WorkAuth>
            label="Can you work there?"
            options={AUTH_OPTIONS}
            value={draft.workAuth}
            onChange={(workAuth) => set({ workAuth })}
            style={{ alignSelf: 'flex-start' }}
          />
        </div>
        <label className="profile-field">
          <span>Phone number</span>
          <select value={draft.phone ?? ''} onChange={(e) => set({ phone: e.target.value || undefined })}>
            <option value="">{phones.length ? 'Main phone' : 'Main phone (none saved yet)'}</option>
            {phones.map((p) => (
              <option key={p} value={p}>
                {phoneLabel(p)}
              </option>
            ))}
            {stalePhone && <option value={stalePhone}>{phoneLabel(stalePhone)} (not in your profile)</option>}
          </select>
        </label>
        <label className="profile-field">
          <span>Salary in</span>
          <select value={draft.currency ?? ''} onChange={(e) => set({ currency: e.target.value || undefined })}>
            <option value="">Main details</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
            {staleCurrency && <option value={staleCurrency}>{staleCurrency}</option>}
          </select>
        </label>
        <SalaryField
          label="Salary"
          amount={draft.salary?.amount ?? null}
          period={period}
          legacyText=""
          currency={draft.currency || effectiveSalaryCurrency(profile)}
          onChange={(amount, next) => {
            setPeriod(next);
            set({ salary: amount === null ? undefined : { amount, period: next } });
          }}
        />
        <label className="profile-field">
          <span>CV language</span>
          <select value={draft.cvLanguage ?? ''} onChange={(e) => set({ cvLanguage: e.target.value || undefined })}>
            <option value="">Main details</option>
            {CV_LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
            {staleLanguage && <option value={staleLanguage}>{staleLanguage}</option>}
          </select>
        </label>
        <div className="profile-field">
          <span aria-hidden="true">Photo on CV</span>
          <SegmentedChoice
            label="Photo on CV"
            options={PHOTO_OPTIONS}
            value={draft.photo ? 'yes' : 'no'}
            onChange={(v) => set({ photo: v === 'yes' })}
            style={{ alignSelf: 'flex-start' }}
          />
        </div>
      </div>
      <button type="button" className="btn sm neg profile-delete-answer" onClick={onRemove}>
        Remove {name}
      </button>
    </ProfileEditor>
  );
}

export function AddCountryDialog({
  existing,
  onAdd,
  onCancel,
}: {
  existing: readonly string[];
  onAdd: (code: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [EU_MARKET, ...COUNTRIES].filter(
      (c) => !existing.includes(c.code) && (!q || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q),
    );
  }, [query, existing]);
  const searchId = useId();
  return (
    <ProfileEditor
      eyebrow="Where you apply"
      title="Add a country"
      description="Add one only if something is different there."
      note="Starts with your main details."
      saveLabel="Add"
      dirty={picked !== null}
      onCancel={onCancel}
      onSave={() => picked && onAdd(picked)}
    >
      <label className="pf-search" htmlFor={searchId}>
        <Glyph name="search" />
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          placeholder="Search countries"
          aria-label="Search countries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="pf-picklist" role="group" aria-label="Countries">
        {options.map((c) => (
          <button
            type="button"
            key={c.code}
            className="pf-pick"
            aria-pressed={picked === c.code}
            onClick={() => setPicked(c.code)}
            onDoubleClick={() => onAdd(c.code)}
          >
            <CountryBadge code={c.code} name={c.name} />
            <span className="pf-pick-name">{c.name}</span>
            {isEuMember(c.code) && <span className="pf-pick-hint">in European Union</span>}
          </button>
        ))}
        {!options.length && <p className="pf-empty">No matching countries.</p>}
      </div>
    </ProfileEditor>
  );
}

/** Reached from the card's "Edit": every country in one place, plus the way to add another. */
export function ManageCountriesDialog({
  markets,
  onOpen,
  onAdd,
  onClose,
}: {
  markets: readonly Market[];
  onOpen: (code: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <ProfileEditor
      eyebrow="Profile & documents"
      title="Where you apply"
      description="The agent picks the country from each job's location. Anything you leave empty uses your main details."
      note="Other countries use your main details."
      onCancel={onClose}
    >
      {markets.length ? (
        <ul className="pf-managelist">
          {markets.map((m) => (
            <li key={m.code}>
              <button type="button" className="pf-manage" onClick={() => onOpen(m.code)}>
                <CountryBadge code={m.code} name={nameOf(m.code)} />
                <span className="pf-manage-text">
                  <strong>{nameOf(m.code)}</strong>
                  <small>{marketSummary(m) || 'Uses your main details'}</small>
                </span>
                <span className={m.workAuth === 'authorized' ? 'pf-status' : 'pf-status need'}>
                  {m.workAuth === 'authorized' ? 'Can work' : 'Visa needed'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pf-empty">No countries yet. Every job uses your main details.</p>
      )}
      <button type="button" className="btn sm pf-addbtn" onClick={onAdd}>
        <Glyph name="plus" /> Add a country
      </button>
    </ProfileEditor>
  );
}
