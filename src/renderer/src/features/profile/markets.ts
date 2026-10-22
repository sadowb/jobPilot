import { MAX_SALARY, type SalaryPeriod } from './salary';

/**
 * "Where you apply": per-country overrides the agent applies when a job's location matches.
 * Anything left undefined falls back to the user's main details.
 */
export const MARKETS_KEY = 'jobpilot.markets.v1';

export type WorkAuth = 'authorized' | 'sponsorship';

/** A salary expectation in the market's own currency. Never derived from another currency. */
export interface MarketSalary {
  amount: number;
  period: SalaryPeriod;
}

export interface Market {
  /** ISO 3166-1 alpha-2 code, or 'EU' for the European Union as one market. */
  code: string;
  workAuth: WorkAuth;
  /** One of the profile's phone numbers, stored verbatim. */
  phone?: string;
  /** ISO 4217 currency code. */
  currency?: string;
  cvLanguage?: string;
  photo?: boolean;
  /** Optional salary in this market's currency (`currency`, else the profile's). */
  salary?: MarketSalary;
}

export const EU_CODE = 'EU';
const MAX_MARKETS = 300;
const MAX_TEXT = 80;

export interface CountryInfo {
  code: string;
  name: string;
  /** Member of the European Union (the 'EU' market covers it). */
  eu?: boolean;
}

/** Countries offered in "Add a country". */
export const COUNTRIES: readonly CountryInfo[] = [
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria', eu: true },
  { code: 'BE', name: 'Belgium', eu: true },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CN', name: 'China' },
  { code: 'CZ', name: 'Czechia', eu: true },
  { code: 'DK', name: 'Denmark', eu: true },
  { code: 'EG', name: 'Egypt' },
  { code: 'FI', name: 'Finland', eu: true },
  { code: 'FR', name: 'France', eu: true },
  { code: 'DE', name: 'Germany', eu: true },
  { code: 'GR', name: 'Greece', eu: true },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IN', name: 'India' },
  { code: 'IE', name: 'Ireland', eu: true },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy', eu: true },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'LU', name: 'Luxembourg', eu: true },
  { code: 'MX', name: 'Mexico' },
  { code: 'MA', name: 'Morocco' },
  { code: 'NL', name: 'Netherlands', eu: true },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland', eu: true },
  { code: 'PT', name: 'Portugal', eu: true },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania', eu: true },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain', eu: true },
  { code: 'SE', name: 'Sweden', eu: true },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

export const EU_MARKET: CountryInfo = { code: EU_CODE, name: 'European Union' };

const BY_CODE = new Map<string, CountryInfo>([
  [EU_CODE, EU_MARKET],
  ...COUNTRIES.map((c): [string, CountryInfo] => [c.code, c]),
]);

let regionNames: Intl.DisplayNames | null | undefined;
function intlRegionName(code: string): string | undefined {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(code) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Display name for a market code, or undefined when the code is not a real country. */
export function countryName(code: string): string | undefined {
  const known = BY_CODE.get(code);
  if (known) return known.name;
  if (!/^[A-Z]{2}$/.test(code)) return undefined;
  const name = intlRegionName(code);
  // 'ZZ' is the reserved "unknown region" code; ICU answers it with a placeholder name.
  return name && name !== code && code !== 'ZZ' ? name : undefined;
}

export const isEuMember = (code: string): boolean => BY_CODE.get(code)?.eu === true;

const CURRENCY_LIST: { code: string; name: string }[] = [
  { code: 'AED', name: 'UAE dirhams' },
  { code: 'AUD', name: 'Australian dollars' },
  { code: 'BRL', name: 'Brazilian reais' },
  { code: 'CAD', name: 'Canadian dollars' },
  { code: 'CHF', name: 'Swiss francs' },
  { code: 'DKK', name: 'Danish kroner' },
  { code: 'EGP', name: 'Egyptian pounds' },
  { code: 'EUR', name: 'Euros' },
  { code: 'GBP', name: 'British pounds' },
  { code: 'INR', name: 'Indian rupees' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'MAD', name: 'Moroccan dirhams' },
  { code: 'MXN', name: 'Mexican pesos' },
  { code: 'NOK', name: 'Norwegian kroner' },
  { code: 'PLN', name: 'Polish zlotys' },
  { code: 'SAR', name: 'Saudi riyals' },
  { code: 'SEK', name: 'Swedish kronor' },
  { code: 'SGD', name: 'Singapore dollars' },
  { code: 'TRY', name: 'Turkish lira' },
  { code: 'USD', name: 'US dollars' },
  { code: 'ZAR', name: 'South African rand' },
  { code: 'CNY', name: 'Chinese yuan' },
  { code: 'CZK', name: 'Czech koruna' },
  { code: 'HKD', name: 'Hong Kong dollars' },
  { code: 'ILS', name: 'Israeli shekels' },
  { code: 'KES', name: 'Kenyan shillings' },
  { code: 'KRW', name: 'South Korean won' },
  { code: 'NGN', name: 'Nigerian naira' },
  { code: 'NZD', name: 'New Zealand dollars' },
  { code: 'QAR', name: 'Qatari riyals' },
  { code: 'RON', name: 'Romanian lei' },
  { code: 'TND', name: 'Tunisian dinars' },
];

/** Alphabetical by name, as shown in every currency select. */
export const CURRENCIES: readonly { code: string; name: string }[] = [...CURRENCY_LIST].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const CV_LANGUAGES = ['Arabic', 'Dutch', 'English', 'French', 'German', 'Italian', 'Portuguese', 'Spanish'];

const fail = (reason: string): never => {
  throw new Error(`Invalid saved countries: ${reason}`);
};

function optionalText(record: Record<string, unknown>, key: 'phone' | 'cvLanguage'): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_TEXT) return fail(`${key} must be short text`);
  return value;
}

/** Validates an already-decoded value. Unknown keys are dropped; anything malformed throws. */
function parseMarketSalary(value: unknown): MarketSalary | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) return fail('salary must be an object');
  const r = value as Record<string, unknown>;
  if (typeof r.amount !== 'number' || !Number.isInteger(r.amount) || r.amount < 0 || r.amount > MAX_SALARY)
    return fail('salary amount must be a whole number');
  if (r.period !== 'year' && r.period !== 'month') return fail('salary period must be year or month');
  return { amount: r.amount, period: r.period };
}

export function parseMarkets(value: unknown): Market[] {
  if (!Array.isArray(value) || value.length > MAX_MARKETS) return fail('expected a list');
  const seen = new Set<string>();
  return value.map((entry: unknown): Market => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return fail('entry is not an object');
    const record = entry as Record<string, unknown>;
    const { code, workAuth, currency, photo } = record;
    if (typeof code !== 'string' || !countryName(code)) return fail('unknown country code');
    if (seen.has(code)) return fail('duplicate country');
    seen.add(code);
    if (workAuth !== 'authorized' && workAuth !== 'sponsorship') return fail('unknown work authorization');
    if (currency !== undefined && (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)))
      return fail('currency must be an ISO 4217 code');
    if (photo !== undefined && typeof photo !== 'boolean') return fail('photo must be true or false');
    const market: Market = { code, workAuth };
    const salary = parseMarketSalary(record.salary);
    if (salary) market.salary = salary;
    const phone = optionalText(record, 'phone');
    const cvLanguage = optionalText(record, 'cvLanguage');
    if (phone !== undefined) market.phone = phone;
    if (currency !== undefined) market.currency = currency;
    if (cvLanguage !== undefined) market.cvLanguage = cvLanguage;
    if (photo !== undefined) market.photo = photo;
    return market;
  });
}

/** Same contract as readProfile/readAnswers: empty storage → defaults, corrupt storage → throws. */
export function readMarkets(raw: string | null): Market[] {
  if (!raw) return [];
  return parseMarkets(JSON.parse(raw));
}

/** What the agent sends for a market, e.g. "French CV with photo · salary in EUR". Empty when nothing is set. */
export function marketSummary(market: Market): string {
  const cv = market.cvLanguage
    ? `${market.cvLanguage} CV${market.photo ? ' with photo' : ''}`
    : market.photo
      ? 'CV with photo'
      : '';
  return [cv, market.currency ? `salary in ${market.currency}` : ''].filter(Boolean).join(' · ');
}

const COUNTRY_CURRENCY: Record<string, string> = {
  EU: 'EUR',
  AU: 'AUD',
  AT: 'EUR',
  BE: 'EUR',
  BR: 'BRL',
  CA: 'CAD',
  CN: 'CNY',
  CZ: 'CZK',
  DK: 'DKK',
  EG: 'EGP',
  FI: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  GR: 'EUR',
  HK: 'HKD',
  IN: 'INR',
  IE: 'EUR',
  IL: 'ILS',
  IT: 'EUR',
  JP: 'JPY',
  KE: 'KES',
  LU: 'EUR',
  MX: 'MXN',
  MA: 'MAD',
  NL: 'EUR',
  NZ: 'NZD',
  NG: 'NGN',
  NO: 'NOK',
  PL: 'PLN',
  PT: 'EUR',
  QA: 'QAR',
  RO: 'RON',
  SA: 'SAR',
  SG: 'SGD',
  ZA: 'ZAR',
  KR: 'KRW',
  ES: 'EUR',
  SE: 'SEK',
  CH: 'CHF',
  TN: 'TND',
  TR: 'TRY',
  AE: 'AED',
  GB: 'GBP',
  US: 'USD',
};

/** The usual salary currency for a market, used to pre-fill a newly added country. */
export const defaultCurrency = (code: string): string | undefined => COUNTRY_CURRENCY[code];
