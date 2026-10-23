import { useId, useMemo, useState, type AriaAttributes, type KeyboardEvent } from 'react';
import { Field, Input, Select, cn } from '../../components/ui';
import { PButton } from './buttons';
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
import {
  dialButton,
  dialItem,
  dialList,
  dialName,
  dialPanel,
  dialSearch,
  emptyText,
  fieldError,
  hintText,
  selectChevron,
} from './styles';

/** What `Field` forwards to its one control. */
type ControlProps = AriaAttributes & { id?: string };

function CountryPicker({
  id,
  'aria-labelledby': labelledBy,
  value,
  name,
  showLegacy,
  legacyText,
  hintId,
  open,
  setOpen,
  query,
  setQuery,
  options,
  onPick,
  close,
}: ControlProps & {
  value: string;
  name: string | undefined;
  showLegacy: boolean;
  legacyText: string;
  hintId: string;
  open: boolean;
  setOpen: (next: (open: boolean) => boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  options: { code: string; name: string }[];
  onPick: (code: string) => void;
  close: () => void;
}) {
  return (
    <>
      <div
        className="relative w-full flex-none"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) close();
        }}
      >
        <button
          id={id}
          type="button"
          className={cn(dialButton, 'w-full')}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${labelledBy} ${hintId}-value`}
          aria-describedby={showLegacy ? hintId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          {value && name ? <CountryBadge code={value} name={name} /> : null}
          <span id={`${hintId}-value`} className={cn(dialName, 'text-left')}>
            {name ?? 'Choose your country'}
          </span>
          <Glyph name="chevronDown" size={14} />
        </button>
        {open && (
          <div className={cn(dialPanel, 'w-full')}>
            <input
              type="search"
              autoFocus
              autoComplete="off"
              aria-label="Search countries"
              placeholder="Search countries"
              className={dialSearch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul role="listbox" aria-label="Countries" className={dialList}>
              {options.map((o) => (
                <li key={o.code} role="option" aria-selected={o.code === value} className="group">
                  <button type="button" tabIndex={-1} className={dialItem} onClick={() => onPick(o.code)}>
                    <CountryBadge code={o.code} name={o.name} />
                    <span className={dialName}>{o.name}</span>
                  </button>
                </li>
              ))}
              {!options.length && <li className={emptyText}>No matching countries.</li>}
            </ul>
          </div>
        )}
      </div>
      {showLegacy && (
        <span id={hintId} className={hintText}>
          Was “{legacyText}”. Choose the matching country.
        </span>
      )}
    </>
  );
}

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
  return (
    <Field label={label} onKeyDown={escape}>
      <CountryPicker
        value={value}
        name={value ? countryName(value) : undefined}
        showLegacy={!value && !!legacyText}
        legacyText={legacyText}
        hintId={hintId}
        open={open}
        setOpen={setOpen}
        query={query}
        setQuery={setQuery}
        options={options}
        onPick={(code) => {
          onChange(code);
          close();
        }}
        close={close}
      />
    </Field>
  );
}

function SalaryControl({
  id,
  'aria-labelledby': labelledBy,
  amount,
  period,
  legacyText,
  onChange,
}: ControlProps & {
  amount: number | null;
  period: SalaryPeriod;
  legacyText: string;
  onChange: (amount: number | null, period: SalaryPeriod) => void;
}) {
  const hintId = `${id}-hint`;
  const showLegacy = amount === null && !!legacyText;
  return (
    <>
      <div className="flex gap-2">
        <Input
          id={id}
          className="min-w-0 flex-[1_1_0]"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 60,000"
          value={amount === null ? '' : groupDigits(String(amount))}
          aria-labelledby={labelledBy}
          aria-describedby={showLegacy ? hintId : undefined}
          onChange={(e) => {
            const next = amountFromInput(e.target.value);
            onChange(next !== null && next > MAX_SALARY ? MAX_SALARY : next, period);
          }}
        />
        <Select
          className={cn(selectChevron, 'w-auto min-w-28 flex-none')}
          aria-label="Salary period"
          value={period}
          onChange={(e) => onChange(amount, e.target.value as SalaryPeriod)}
        >
          <option value="year">per year</option>
          <option value="month">per month</option>
        </Select>
      </div>
      {showLegacy && (
        <span id={hintId} className={hintText}>
          Was “{legacyText}”. Enter the amount as a number.
        </span>
      )}
    </>
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
  return (
    <Field
      label={`${label}${currency ? ` (${currency})` : ''}`}
      className="[&>label]:text-[15px]! [&>label]:font-normal!"
    >
      <SalaryControl amount={amount} period={period} legacyText={legacyText} onChange={onChange} />
    </Field>
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
  const iconButton = 'w-9 min-w-9 px-0!';
  return (
    <fieldset className="mb-6 min-w-0 border-0 p-0">
      <legend className="mb-3 p-0 text-[13px] font-semibold">Languages</legend>
      {entries.length === 0 && <p className={emptyText}>No languages yet.</p>}
      {entries.map((e, i) => {
        const label = e.language ? languageName(e.language) : (e.raw ?? `Language ${i + 1}`);
        return (
          <div
            className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_repeat(3,36px)] items-center gap-2.5 py-[5px]"
            key={e.id}
            role="group"
            aria-label={`Language ${i + 1}: ${label}`}
          >
            <Select
              className={selectChevron}
              size="sm"
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
            </Select>
            <Select
              className={selectChevron}
              size="sm"
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
            </Select>
            <PButton
              variant="ghost"
              className={iconButton}
              aria-label={`Move ${label} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <Glyph name="arrowUp" size={15} />
            </PButton>
            <PButton
              variant="ghost"
              className={iconButton}
              aria-label={`Move ${label} down`}
              disabled={i === entries.length - 1}
              onClick={() => move(i, 1)}
            >
              <Glyph name="arrowDown" size={15} />
            </PButton>
            <PButton
              variant="ghost"
              className={iconButton}
              aria-label={`Remove ${label}`}
              onClick={() => onChange(entries.filter((x) => x.id !== e.id))}
            >
              <Glyph name="close" size={15} />
            </PButton>
          </div>
        );
      })}
      {problem && (
        <p className={fieldError} role="alert">
          {problem}
        </p>
      )}
      <div className="mt-1.5 flex gap-2 border-t border-line pt-3">
        <PButton
          className="gap-1.5!"
          onClick={() => onChange([...entries, { id: newId(), language: '', level: 'Professional' }])}
        >
          <Glyph name="plus" size={14} /> Add a language
        </PButton>
      </div>
    </fieldset>
  );
}

function NoticeControl({
  id,
  notice,
  legacyText,
  onChange,
}: ControlProps & {
  notice: Notice | null;
  legacyText: string;
  onChange: (next: Notice | null) => void;
}) {
  // Choosing "From a date…" before a date exists has no stored value yet, so the choice lives here.
  const [dateMode, setDateMode] = useState(notice?.kind === 'date');
  const value = dateMode || notice?.kind === 'date' ? 'date' : notice ? String(notice.days) : '';
  const showLegacy = !notice && !!legacyText;
  return (
    <>
      <Select
        className={selectChevron}
        id={id}
        value={value}
        aria-describedby={showLegacy ? `${id}-hint` : undefined}
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
      </Select>
      {value === 'date' && (
        <Input
          type="date"
          aria-label="Start date"
          value={notice?.kind === 'date' ? notice.iso : ''}
          onChange={(e) => onChange(isIsoDate(e.target.value) ? { kind: 'date', iso: e.target.value } : null)}
        />
      )}
      {showLegacy && (
        <span id={`${id}-hint`} className={hintText}>
          Was “{legacyText}”. Check this and choose a notice.
        </span>
      )}
    </>
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
  return (
    <Field label="Notice" className="[&>label]:text-[15px]! [&>label]:font-normal!">
      <NoticeControl notice={notice} legacyText={legacyText} onChange={onChange} />
    </Field>
  );
}
