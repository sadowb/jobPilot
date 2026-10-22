import { getCountries } from 'libphonenumber-js/max';
import { COUNTRIES, countryName } from './markets';

export interface CountryOption {
  code: string;
  name: string;
}

let displayNames: Intl.DisplayNames | undefined;
function names(): Intl.DisplayNames | undefined {
  try {
    displayNames ??= new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  } catch {
    /* no ICU: fall back to the built-in list only */
  }
  return displayNames;
}

let options: CountryOption[] | undefined;
/** ISO 3166-1 countries with names from Intl.DisplayNames, sorted by name. */
export function countryOptions(): readonly CountryOption[] {
  if (!options) {
    const seen = new Map<string, string>();
    for (const code of getCountries()) {
      const name = names()?.of(code);
      if (name && name !== code) seen.set(code, name);
    }
    for (const c of COUNTRIES) if (!seen.has(c.code)) seen.set(c.code, c.name);
    options = [...seen].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }
  return options;
}

/** Names people actually type, that Intl does not return as the official English name. */
const ALIASES: Record<string, string> = {
  usa: 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  america: 'US',
  'united states of america': 'US',
  uk: 'GB',
  'u.k.': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  uae: 'AE',
  emirates: 'AE',
  holland: 'NL',
  'the netherlands': 'NL',
  'ivory coast': 'CI',
  korea: 'KR',
  'republic of korea': 'KR',
  'czech republic': 'CZ',
  turkey: 'TR',
  turkiye: 'TR',
  russia: 'RU',
  maroc: 'MA',
  'kingdom of morocco': 'MA',
  deutschland: 'DE',
  espana: 'ES',
  italia: 'IT',
  'hong kong sar': 'HK',
  burma: 'MM',
  'eswatini (swaziland)': 'SZ',
  swaziland: 'SZ',
};

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

let byName: Map<string, string> | undefined;

/**
 * Free text → ISO 3166 alpha-2. Matches the English name or a common alias (case- and accent-insensitive),
 * or an already-valid code. Returns undefined when nothing matches.
 */
export function matchCountry(text: string): string | undefined {
  const key = fold(text);
  if (!key) return undefined;
  if (!byName) {
    byName = new Map(countryOptions().map((c) => [fold(c.name), c.code]));
    for (const [alias, code] of Object.entries(ALIASES)) byName.set(fold(alias), code);
  }
  const named = byName.get(key);
  if (named) return named;
  const upper = text.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) && countryName(upper) && upper !== 'EU' ? upper : undefined;
}
