import { EmailSchema, matchesDocumentSignature, MAX_SIGNATURE_BYTES } from '../../../../shared/dto';
import { parseCareer, type CareerEntry } from './career';
import { matchCountry } from './countries';
import { parseLanguages, parseLanguageText, type LanguageEntry } from './languages';
import { CURRENCIES, countryName, defaultCurrency } from './markets';
import { migratePhone, type CountryCode } from './phones';
import { isIsoDate, parseNotice, type Notice } from './notice';
import { parseSalaryText, MAX_SALARY, type SalaryPeriod } from './salary';

export const PROFILE_KEY = 'jobpilot.profile.v1';
/** Legacy single-text answers. Kept untouched as the backup after migration to the market-aware store. */
export const ANSWERS_KEY = 'jobpilot.answers.v1';

const EMPTY_FIELDS = {
  firstName: '',
  lastName: '',
  preferredName: '',
  headline: '',
  email: '',
  /** E.164 when valid; a legacy free-text value is kept verbatim until the user fixes it. */
  phone: '',
  alternatePhone: '',
  address: '',
  city: '',
  region: '',
  postalCode: '',
  /** Legacy free text. Only kept when it could not be matched to a country; see `countryCode`. */
  country: '',
  /** ISO 3166-1 alpha-2, e.g. 'MA'. The source of truth for the home market, phone region and currency. */
  countryCode: '',
  website: '',
  linkedin: '',
  github: '',
  bio: '',
  school: '',
  /** YYYY-MM, optional. */
  schoolStart: '',
  degree: '',
  fieldOfStudy: '',
  graduation: '',
  role: '',
  workMode: '',
  locations: '',
  /** Legacy free text. Only kept when it could not be turned into a `notice`. */
  startDate: '',
  /** Legacy free-text salary, kept only while it is ambiguous. The amount lives in `salaryAmount`. */
  salary: '',
  /** ISO 4217. Empty means "the currency of the profile country". */
  salaryCurrency: '',
};
export type ProfileField = keyof typeof EMPTY_FIELDS;
export type PersonalProfile = Record<ProfileField, string> & {
  career: CareerEntry[];
  languages: LanguageEntry[];
  /** Whole number in `salaryCurrency` (or the country's currency). Null when not set. */
  salaryAmount: number | null;
  salaryPeriod: SalaryPeriod;
  /** When the owner can start. Null when not set. */
  notice: Notice | null;
};
export const EMPTY_PROFILE: PersonalProfile = {
  ...EMPTY_FIELDS,
  career: [],
  languages: [],
  salaryAmount: null,
  salaryPeriod: 'year',
  notice: null,
};

export interface CommonAnswer {
  id: string;
  question: string;
  answer: string;
}
export const EMPTY_ANSWERS: CommonAnswer[] = [
  { id: 'start', question: 'When can you start?', answer: '' },
  { id: 'authorization', question: 'Where are you authorized to work?', answer: '' },
  { id: 'sponsorship', question: 'Will you need visa sponsorship?', answer: '' },
  { id: 'relocate', question: 'Are you willing to relocate?', answer: '' },
  { id: 'salary', question: 'What are your salary expectations?', answer: '' },
  { id: 'intro', question: 'Tell us about yourself.', answer: '' },
];

/**
 * Reject malformed saved data rather than letting it replace the user's defaults.
 * Free-text phones are migrated to E.164 using the profile country as the default region;
 * numbers that cannot be parsed are kept as they were.
 */
export function readProfile(raw: string | null): PersonalProfile {
  if (!raw) return { ...EMPTY_PROFILE, career: [], languages: [] };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid profile');
  const record = value as Record<string, unknown>;
  const strings = Object.fromEntries(
    Object.entries(EMPTY_FIELDS).map(([key, fallback]) => {
      const field = record[key];
      if (field !== undefined && typeof field !== 'string') throw new Error('Invalid profile field');
      return [key, field ?? fallback];
    }),
  ) as Record<ProfileField, string>;
  if (strings.countryCode && (strings.countryCode === 'EU' || !countryName(strings.countryCode)))
    throw new Error('Invalid country');
  // Free-text country → code. If nothing matches, the raw text stays and the editor asks the user to choose.
  if (!strings.countryCode && strings.country.trim()) {
    const code = matchCountry(strings.country);
    if (code) {
      strings.countryCode = code;
      strings.country = '';
    }
  }
  const region = strings.countryCode ? (strings.countryCode as CountryCode) : undefined;
  strings.phone = migratePhone(strings.phone, region);
  strings.alternatePhone = migratePhone(strings.alternatePhone, region);

  const amount = record.salaryAmount;
  if (
    amount !== undefined &&
    amount !== null &&
    (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0 || amount > MAX_SALARY)
  )
    throw new Error('Invalid salary');
  const period = record.salaryPeriod;
  if (period !== undefined && period !== 'year' && period !== 'month') throw new Error('Invalid salary period');
  let salaryAmount: number | null = typeof amount === 'number' ? amount : null;
  let salaryPeriod: SalaryPeriod = period ?? 'year';
  // Free-text salary → number when unambiguous; otherwise the text stays and the editor asks for an amount.
  if (salaryAmount === null && strings.salary.trim()) {
    const parsed = parseSalaryText(strings.salary);
    if (parsed) {
      salaryAmount = parsed.amount;
      salaryPeriod = parsed.period;
      if (!strings.salaryCurrency && parsed.currency && CURRENCIES.some((c) => c.code === parsed.currency))
        strings.salaryCurrency = parsed.currency;
      strings.salary = '';
    }
  }

  // Notice: the structured value wins. An old ISO date becomes a date notice; any other text stays and is flagged.
  let notice = parseNotice(record.notice);
  if (!notice && isIsoDate(strings.startDate.trim())) {
    notice = { kind: 'date', iso: strings.startDate.trim() };
    strings.startDate = '';
  }

  const languages =
    record.languages === undefined
      ? []
      : typeof record.languages === 'string'
        ? parseLanguageText(record.languages)
        : parseLanguages(record.languages);
  return {
    ...strings,
    career: record.career === undefined ? [] : parseCareer(record.career),
    languages,
    salaryAmount,
    salaryPeriod,
    notice,
  };
}

export function readAnswers(raw: string | null): CommonAnswer[] {
  if (!raw) return EMPTY_ANSWERS.map((a) => ({ ...a }));
  const value: unknown = JSON.parse(raw);
  if (
    !Array.isArray(value) ||
    !value.every(
      (a) =>
        a &&
        typeof a === 'object' &&
        typeof a.id === 'string' &&
        typeof a.question === 'string' &&
        typeof a.answer === 'string',
    ) ||
    new Set(value.map((a) => a.id)).size !== value.length
  )
    throw new Error('Invalid saved answers');
  return value;
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ME'
  );
}

export function documentError(file: Pick<File, 'name' | 'size'>): string | null {
  if (!/\.(pdf|docx)$/i.test(file.name)) return 'Choose a PDF or DOCX file.';
  if (!file.size) return 'This file is empty. Choose another file.';
  return file.size > 20 * 1024 * 1024 ? 'Choose a file smaller than 20 MB.' : null;
}

export const emailProblem = (value: string): string | null =>
  EmailSchema.safeParse(value.trim()).success ? null : 'Enter an email like name@example.com.';

/** Content check on top of documentError: the file must really start like a PDF or DOCX. */
export async function documentContentError(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, MAX_SIGNATURE_BYTES).arrayBuffer());
  return matchesDocumentSignature(file.name, head) ? null : 'This file is not a real PDF or DOCX. Choose another file.';
}

/** Comma- or newline-separated free text → trimmed, de-duplicated entries (case-insensitive). */
export function splitList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function fullName(profile: Pick<PersonalProfile, 'firstName' | 'lastName'>): string {
  return [profile.firstName, profile.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

const MAX_FILE_STEM = 100;
/** Device names Windows refuses as file names, with or without an extension. */
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * The file name employers receive: "First Last.pdf". Characters that are illegal on common filesystems
 * (and control characters) are dropped; an empty or reserved result falls back to "Resume.pdf".
 */
export function cvFileName(profile: Pick<PersonalProfile, 'firstName' | 'lastName'>): string {
  const cleaned = fullName(profile)
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '');
  // Cut by code point, not UTF-16 unit, so an emoji is never split into a lone surrogate.
  const stem = Array.from(cleaned)
    .slice(0, MAX_FILE_STEM)
    .join('')
    .replace(/[.\s]+$/, '');
  return `${stem && !WINDOWS_RESERVED.test(stem) ? stem : 'Resume'}.pdf`;
}

export const EDIT_IDENTITY_EVENT = 'jobpilot:edit-identity';
export const OPEN_EDITOR_EVENT = 'jobpilot:open-editor';
export type OpenEditorDetail =
  { kind: 'profile'; group: string } | { kind: 'market'; code: string } | { kind: 'manage' };

/** The salary currency: the one the user chose, else the usual one for the profile country, else empty. */
export function effectiveSalaryCurrency(profile: Pick<PersonalProfile, 'salaryCurrency' | 'countryCode'>): string {
  if (profile.salaryCurrency) return profile.salaryCurrency;
  return (profile.countryCode && defaultCurrency(profile.countryCode)) || '';
}
