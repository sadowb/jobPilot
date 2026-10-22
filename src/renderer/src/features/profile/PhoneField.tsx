import { useMemo, useState, type AriaAttributes, type KeyboardEvent } from 'react';
import { Field, Input } from '../../components/ui';
import { CountryBadge, Glyph } from './icons';
import { dialButton, dialCode, dialItem, dialList, dialName, dialPanel, dialSearch, emptyText } from './styles';
import {
  asYouType,
  callingCode,
  CHECK_NUMBER,
  dialCodeOptions,
  nationalOf,
  parsePhone,
  regionName,
  type CountryCode,
} from './phones';

const FALLBACK_REGION: CountryCode = 'US';

/**
 * Country-code picker + national number formatted as you type. Reports E.164 when the number is valid;
 * while it is incomplete it reports "+<code><digits>", which still fails validation on save.
 */
export function PhoneField({
  label,
  value,
  defaultRegion,
  onChange,
}: {
  label: string;
  /** Stored value: E.164, a legacy free-text number, or empty. */
  value: string;
  /** Region to assume for numbers without a country code (the profile's country). */
  defaultRegion?: CountryCode;
  onChange: (stored: string) => void;
}) {
  const [initial] = useState(() => {
    const info = parsePhone(value, defaultRegion);
    const region = info.region ?? defaultRegion ?? FALLBACK_REGION;
    return { region, national: info.valid ? nationalOf(value, defaultRegion) : value.trim() };
  });
  const [region, setRegion] = useState<CountryCode>(initial.region);
  const [national, setNational] = useState(initial.national);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dialCodeOptions().filter(
      (o) => !q || o.name.toLowerCase().includes(q) || o.dial.includes(q) || o.code.toLowerCase() === q,
    );
  }, [query]);

  const report = (nextRegion: CountryCode, text: string) => {
    const info = parsePhone(text, nextRegion);
    const digits = text.replace(/\D/g, '');
    onChange(info.e164 ?? (digits ? `+${callingCode(nextRegion)}${digits}` : ''));
  };
  const type = (text: string) => {
    // Letters are never part of a phone number here; drop them as they are typed.
    const formatted = asYouType(region, text.replace(/[^\d\s+().-]/g, ''));
    setNational(formatted);
    report(region, formatted);
  };
  const pick = (next: CountryCode) => {
    setRegion(next);
    setOpen(false);
    setQuery('');
    report(next, national);
  };
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
  const invalid = national.trim() !== '' && !parsePhone(national, region).valid;
  const showError = invalid && touched;
  return (
    <Field
      label={label}
      error={showError ? CHECK_NUMBER : undefined}
      className="[&>label]:text-[15px]! [&>label]:font-normal!"
      onKeyDown={escape}
    >
      <PhoneControl
        label={label}
        region={region}
        national={national}
        open={open}
        setOpen={setOpen}
        query={query}
        setQuery={setQuery}
        options={options}
        onPick={pick}
        close={close}
        onType={type}
        onTouched={() => setTouched(true)}
      />
    </Field>
  );
}

function PhoneControl({
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  label,
  region,
  national,
  open,
  setOpen,
  query,
  setQuery,
  options,
  onPick,
  close,
  onType,
  onTouched,
}: AriaAttributes & {
  id?: string;
  label: string;
  region: CountryCode;
  national: string;
  open: boolean;
  setOpen: (next: (open: boolean) => boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  options: ReturnType<typeof dialCodeOptions>;
  onPick: (code: CountryCode) => void;
  close: () => void;
  onType: (text: string) => void;
  onTouched: () => void;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <div
        className="relative flex-none"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) close();
        }}
      >
        <button
          type="button"
          className={dialButton}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label} country code: ${regionName(region)} +${callingCode(region)}`}
          onClick={() => setOpen((o) => !o)}
        >
          <CountryBadge code={region} name={regionName(region)} />
          <span>+{callingCode(region)}</span>
          <Glyph name="chevronDown" size={14} />
        </button>
        {open && (
          <div className={dialPanel}>
            <input
              type="search"
              autoFocus
              autoComplete="off"
              aria-label="Search country codes"
              placeholder="Search countries"
              className={dialSearch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul role="listbox" aria-label="Country codes" className={dialList}>
              {options.map((o) => (
                <li key={o.code} role="option" aria-selected={o.code === region} className="group">
                  <button type="button" tabIndex={-1} className={dialItem} onClick={() => onPick(o.code)}>
                    <CountryBadge code={o.code} name={o.name} />
                    <span className={dialName}>{o.name}</span>
                    <span className={dialCode}>{o.dial}</span>
                  </button>
                </li>
              ))}
              {!options.length && <li className={emptyText}>No matching countries.</li>}
            </ul>
          </div>
        )}
      </div>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className="min-w-0 flex-1"
        value={national}
        maxLength={40}
        aria-invalid={invalid ?? false}
        aria-describedby={describedBy}
        onChange={(e) => onType(e.target.value)}
        onBlur={onTouched}
      />
    </div>
  );
}
