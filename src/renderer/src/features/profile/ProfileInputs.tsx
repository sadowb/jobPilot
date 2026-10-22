import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { CountryBadge, Glyph } from './icons';
import { countryOptions } from './countries';
import { countryName } from './markets';
import {
  LEVELS,
  languageName,
  languageOptions,
  languagesError,
  type LanguageEntry,
  type LanguageLevel,
} from './languages';
import { NOTICE_PERIODS, isIsoDate, type Notice } from './notice';
import { MAX_SALARY, amountFromInput, groupDigits, type SalaryPeriod } from './salary';

/** Searchable ISO 3166 country select. Reports the alpha-2 code. */
export function CountrySelect({
  label,
  value,
  legacyText,
  onChange,
}: {
  label: string;
  value: string;
  /** Old free text that matched no country. Shown so the owner knows what to replace. */
  legacyText: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const hintId = useId();
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return countryOptions().filter((o) => !q || o.name.toLowerCase().includes(q) || o.code.toLowerCase() === q);
  }, [query]);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const escape = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !open) return;
    // Close the list, not the dialog around it.
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  const name = value ? countryName(value) : undefined;
  return (
    <div className="profile-field pf-country" onKeyDown={escape}>
      <span id={`${hintId}-label`}>{label}</span>
      <div
        className="pf-dial pf-dial-block"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) close();
        }}
      >
        <button
          type="button"
          className="pf-dialbtn"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${hintId}-label ${hintId}-value`}
          aria-describedby={!value && legacyText ? hintId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          {value && name ? <CountryBadge code={value} name={name} /> : null}
          <span id={`${hintId}-value`} className="pf-dial-name">
            {name ?? 'Choose your country'}
          </span>
          <Glyph name="chevronDown" size={14} />
        </button>
        {open && (
          <div className="pf-dialpanel">
            <input
              type="search"
              autoFocus
              autoComplete="off"
              aria-label="Search countries"
              placeholder="Search countries"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul role="listbox" aria-label="Countries">
              {options.map((o) => (
                <li key={o.code} role="option" aria-selected={o.code === value}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      onChange(o.code);
                      close();
                    }}
                  >
                    <CountryBadge code={o.code} name={o.name} />
                    <span className="pf-dial-name">{o.name}</span>
                  </button>
                </li>
              ))}
              {!options.length && <li className="pf-empty">No matching countries.</li>}
            </ul>
          </div>
        )}
      </div>
      {!value && legacyText && (
        <span id={hintId} className="pf-hint">
          Was “{legacyText}”. Choose the matching country.
        </span>
      )}
    </div>
  );
}

/** Digits-only amount with grouped display, and a per year / per month period. */
export function SalaryField({
  label = 'Salary expectation',
  amount,
  period,
  legacyText,
  currency,
  onChange,
}: {
  label?: string;
  amount: number | null;
  period: SalaryPeriod;
  legacyText: string;
  currency: string;
  onChange: (amount: number | null, period: SalaryPeriod) => void;
}) {
  const id = useId();
  return (
    <div className="profile-field pf-salary">
      <label htmlFor={id}>
        <span>
          {label}
          {currency ? ` (${currency})` : ''}
        </span>
      </label>
      <div className="pf-salary-row">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 60,000"
          value={amount === null ? '' : groupDigits(String(amount))}
          aria-describedby={amount === null && legacyText ? `${id}-hint` : undefined}
          onChange={(e) => {
            const next = amountFromInput(e.target.value);
            onChange(next !== null && next > MAX_SALARY ? MAX_SALARY : next, period);
          }}
        />
        <select
          aria-label="Salary period"
          value={period}
          onChange={(e) => onChange(amount, e.target.value as SalaryPeriod)}
        >
          <option value="year">per year</option>
          <option value="month">per month</option>
        </select>
      </div>
      {amount === null && legacyText && (
        <span id={`${id}-hint`} className="pf-hint">
          Was “{legacyText}”. Enter the amount as a number.
        </span>
      )}
    </div>
  );
}

let counter = 0;
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `lang-new-${++counter}`;

/** Structured language list: choose a language and level; add, remove and reorder. */
export function LanguageEditor({
  entries,
  onChange,
}: {
  entries: readonly LanguageEntry[];
  onChange: (next: LanguageEntry[]) => void;
}) {
  const options = useMemo(() => languageOptions(), []);
  const problem = languagesError(entries);
  const move = (index: number, by: -1 | 1) => {
    const next = [...entries];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };
  const taken = new Set(entries.map((e) => e.language));
  return (
    <fieldset className="pf-career pf-langs">
      <legend>Languages</legend>
      {entries.length === 0 && <p className="pf-empty">No languages yet.</p>}
      {entries.map((e, i) => {
        const label = e.language ? languageName(e.language) : (e.raw ?? `Language ${i + 1}`);
        return (
          <div className="pf-lang-row" key={e.id} role="group" aria-label={`Language ${i + 1}: ${label}`}>
            <select
              aria-label={`Language ${i + 1}`}
              value={e.language}
              onChange={(ev) =>
                onChange(
                  entries.map((x) => {
                    if (x.id !== e.id) return x;
                    // Choosing a language resolves the flagged entry, so the old text is dropped.
                    return { id: x.id, language: ev.target.value, level: x.level };
                  }),
                )
              }
            >
              <option value="">{e.raw ? `Check this: “${e.raw}”` : 'Choose a language'}</option>
              {options.map((o) => (
                <option key={o.code} value={o.code} disabled={o.code !== e.language && taken.has(o.code)}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              aria-label={`Level for ${label}`}
              value={e.level}
              onChange={(ev) =>
                onChange(
                  entries.map((x) => (x.id === e.id ? { ...x, level: ev.target.value as LanguageLevel | '' } : x)),
                )
              }
            >
              <option value="">Level</option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn sm ghost ic"
              aria-label={`Move ${label} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <Glyph name="arrowUp" size={15} />
            </button>
            <button
              type="button"
              className="btn sm ghost ic"
              aria-label={`Move ${label} down`}
              disabled={i === entries.length - 1}
              onClick={() => move(i, 1)}
            >
              <Glyph name="arrowDown" size={15} />
            </button>
            <button
              type="button"
              className="btn sm ghost ic"
              aria-label={`Remove ${label}`}
              onClick={() => onChange(entries.filter((x) => x.id !== e.id))}
            >
              <Glyph name="close" size={15} />
            </button>
          </div>
        );
      })}
      {problem && (
        <p className="pf-field-error" role="alert">
          {problem}
        </p>
      )}
      <div className="pf-career-actions">
        <button
          type="button"
          className="btn sm"
          onClick={() => onChange([...entries, { id: newId(), language: '', level: 'Professional' }])}
        >
          <Glyph name="plus" size={14} /> Add a language
        </button>
      </div>
    </fieldset>
  );
}

/** Notice select. "From a date…" reveals a date input; a period needs no date. */
export function NoticeField({
  notice,
  legacyText,
  onChange,
}: {
  notice: Notice | null;
  legacyText: string;
  onChange: (next: Notice | null) => void;
}) {
  const id = useId();
  // Choosing "From a date…" before a date exists has no stored value yet, so the choice lives here.
  const [dateMode, setDateMode] = useState(notice?.kind === 'date');
  const value = dateMode || notice?.kind === 'date' ? 'date' : notice ? String(notice.days) : '';
  return (
    <div className="profile-field pf-notice">
      <label htmlFor={id}>
        <span>Notice</span>
      </label>
      <select
        id={id}
        value={value}
        aria-describedby={!notice && legacyText ? `${id}-hint` : undefined}
        onChange={(e) => {
          const next = e.target.value;
          if (next === 'date') {
            setDateMode(true);
            return;
          }
          setDateMode(false);
          onChange(next === '' ? null : { kind: 'period', days: Number(next) });
        }}
      >
        <option value="">Not specified</option>
        {NOTICE_PERIODS.map((p) => (
          <option key={p.days} value={p.days}>
            {p.label}
          </option>
        ))}
        <option value="date">From a date…</option>
      </select>
      {value === 'date' && (
        <input
          type="date"
          aria-label="Start date"
          value={notice?.kind === 'date' ? notice.iso : ''}
          onChange={(e) => onChange(isIsoDate(e.target.value) ? { kind: 'date', iso: e.target.value } : null)}
        />
      )}
      {!notice && legacyText && (
        <span id={`${id}-hint`} className="pf-hint">
          Was “{legacyText}”. Check this and choose a notice.
        </span>
      )}
    </div>
  );
}
