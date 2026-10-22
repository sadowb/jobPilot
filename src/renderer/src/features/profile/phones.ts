import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';
import { matchCountry } from './countries';
import { COUNTRIES } from './markets';

export type { CountryCode };
export type PhoneType = 'MOBILE' | 'LANDLINE';

export interface PhoneInfo {
  valid: boolean;
  /** The text as stored (trimmed). For an invalid number this is the only thing we know. */
  raw: string;
  /** E.164, e.g. "+212612345678". Only when valid. */
  e164?: string;
  region?: CountryCode;
  /** "+212" */
  dial?: string;
  /** "+212 6 12 34 56 78" */
  international?: string;
  /** Only when the metadata can tell. */
  type?: PhoneType;
}

export const CHECK_NUMBER = 'Check this number';

/** Phones are stored as E.164 when valid; anything else is kept verbatim so no data is lost. */
export function parsePhone(value: string, defaultRegion?: CountryCode): PhoneInfo {
  const raw = value.trim();
  // libphonenumber reads letters as vanity digits ("612345678abc" parses), so letters are rejected up front.
  if (!raw || /[a-z]/i.test(raw)) return { valid: false, raw };
  const parsed = parsePhoneNumberFromString(raw, defaultRegion);
  if (!parsed?.isValid()) return { valid: false, raw };
  const kind = parsed.getType();
  return {
    valid: true,
    raw,
    e164: parsed.number,
    region: parsed.country,
    dial: `+${parsed.countryCallingCode}`,
    international: parsed.formatInternational(),
    type: kind === 'MOBILE' ? 'MOBILE' : kind === 'FIXED_LINE' ? 'LANDLINE' : undefined,
  };
}

/** E.164 when the text is a valid number (in `region` if it has no country code), otherwise the trimmed text. */
export function normalizePhone(value: string, region?: CountryCode): string {
  const info = parsePhone(value, region);
  return info.e164 ?? info.raw;
}

/** Used on read: free-text phones become E.164 where possible; unparseable ones are returned unchanged. */
export const migratePhone = normalizePhone;

/** Save-time check. Empty is fine; anything that is not a valid number is rejected. */
export function phoneProblem(value: string): string | null {
  return !value.trim() || parsePhone(value).valid ? null : CHECK_NUMBER;
}

/** The number as people type it inside its own country, e.g. "06 12 34 56 78". */
export function nationalOf(value: string, defaultRegion?: CountryCode): string {
  const parsed = parsePhoneNumberFromString(value.trim(), defaultRegion);
  return parsed?.isValid() ? parsed.formatNational() : value.trim();
}

export const callingCode = (region: CountryCode): string => getCountryCallingCode(region);

export function asYouType(region: CountryCode, text: string): string {
  return new AsYouType(region).input(text);
}

/** "+212 6 12 34 56 78", or the raw text when it is not a valid number. */
export function formatPhone(value: string, defaultRegion?: CountryCode): string {
  const info = parsePhone(value, defaultRegion);
  return info.international ?? info.raw;
}

let regionNames: Intl.DisplayNames | undefined;

function names(): Intl.DisplayNames | undefined {
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  } catch {
    /* no ICU: only the built-in list is available */
  }
  return regionNames;
}

export function regionName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? names()?.of(code) ?? code;
}

/** "Morocco" → "MA" (names and common aliases). Undefined for unknown text. */
export function regionFromCountryName(name: string): CountryCode | undefined {
  return matchCountry(name) as CountryCode | undefined;
}

/** A stored country code as a phone region. Undefined for empty or unknown codes. */
export function regionOf(code: string): CountryCode | undefined {
  return code ? regionFromCountryName(code) : undefined;
}

export interface DialOption {
  code: CountryCode;
  name: string;
  dial: string;
}

let dialOptions: DialOption[] | undefined;
/** Every region that has a calling code, sorted by country name. */
export function dialCodeOptions(): readonly DialOption[] {
  dialOptions ??= getCountries()
    .map((code) => ({ code, name: regionName(code), dial: `+${getCountryCallingCode(code)}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return dialOptions;
}
