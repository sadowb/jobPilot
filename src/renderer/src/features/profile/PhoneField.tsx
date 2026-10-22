import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CountryBadge, Glyph } from './icons';
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
  const root = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const errorId = useId();
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
    <div className="profile-field pf-phone" ref={root} onKeyDown={escape}>
      <label htmlFor={inputId}>
        <span>{label}</span>
      </label>
      <div className="pf-phone-row">
        <div
          className="pf-dial"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) close();
          }}
        >
          <button
            type="button"
            className="pf-dialbtn"
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
            <div className="pf-dialpanel">
              <input
                type="search"
                autoFocus
                autoComplete="off"
                aria-label="Search country codes"
                placeholder="Search countries"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul role="listbox" aria-label="Country codes">
                {options.map((o) => (
                  <li key={o.code} role="option" aria-selected={o.code === region}>
                    <button type="button" tabIndex={-1} onClick={() => pick(o.code)}>
                      <CountryBadge code={o.code} name={o.name} />
                      <span className="pf-dial-name">{o.name}</span>
                      <span className="pf-dial-code">{o.dial}</span>
                    </button>
                  </li>
                ))}
                {!options.length && <li className="pf-empty">No matching countries.</li>}
              </ul>
            </div>
          )}
        </div>
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          maxLength={40}
          aria-invalid={showError}
          aria-describedby={showError ? errorId : undefined}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setTouched(true)}
        />
      </div>
      {showError && (
        <span id={errorId} className="pf-field-error" role="alert">
          {CHECK_NUMBER}
        </span>
      )}
    </div>
  );
}
