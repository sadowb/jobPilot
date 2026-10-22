import { countryName, type Market, type MarketSalary } from './markets';
import { noticeAnswer } from './notice';
import { effectiveSalaryCurrency, readAnswers, type CommonAnswer, type PersonalProfile } from './personal';
import { formatSalary } from './salary';

/** Market-aware common answers: one default text plus optional per-country overrides. */
export const ANSWERS_V2_KEY = 'jobpilot.answers.v2';

export interface Answer {
  id: string;
  question: string;
  default: string;
  /** Keyed by market code (a "Where you apply" country, or the home country). Never empty strings. */
  overrides: Record<string, string>;
}

const MAX_ANSWERS = 500;
const MAX_QUESTION = 500;
const MAX_TEXT = 10000;

/** What a brand-new user starts with. Work authorisation and salary are derived, so they are not listed. */
export const STARTER_ANSWERS: readonly Answer[] = [
  { id: 'relocate', question: 'Are you willing to relocate?', default: '', overrides: {} },
  { id: 'intro', question: 'Tell us about yourself.', default: '', overrides: {} },
];

const fail = (reason: string): never => {
  throw new Error(`Invalid saved answers: ${reason}`);
};

/** Strict validation of a decoded value. Unknown keys are dropped; anything malformed throws. */
export function parseAnswersV2(value: unknown): Answer[] {
  if (!Array.isArray(value) || value.length > MAX_ANSWERS) return fail('expected a list');
  const ids = new Set<string>();
  return value.map((item: unknown): Answer => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail('entry is not an object');
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id || ids.has(r.id)) return fail('bad or duplicate id');
    ids.add(r.id);
    if (typeof r.question !== 'string' || r.question.length > MAX_QUESTION) return fail('bad question');
    if (typeof r.default !== 'string' || r.default.length > MAX_TEXT) return fail('bad default answer');
    const overrides: Record<string, string> = {};
    const raw = r.overrides ?? {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('overrides must be an object');
    for (const [code, text] of Object.entries(raw)) {
      if (!countryName(code)) return fail('unknown country in overrides');
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT) return fail('bad override text');
      overrides[code] = text;
    }
    return { id: r.id, question: r.question, default: r.default, overrides };
  });
}

const DERIVED_LEGACY_IDS = new Set(['authorization', 'sponsorship', 'salary', 'start']);

/**
 * v1 → v2: every written answer becomes a default. Only the three legacy questions that are now derived from
 * "Where you apply" are dropped, and only when they were empty, so no text is ever lost.
 */
export function migrateLegacyAnswers(legacy: readonly CommonAnswer[]): Answer[] {
  return legacy
    .filter((a) => !(DERIVED_LEGACY_IDS.has(a.id) && !a.answer.trim()))
    .map((a) => ({ id: a.id, question: a.question, default: a.answer, overrides: {} }));
}

/**
 * Same contract as readMarkets: empty storage → defaults, corrupt storage → throws.
 * With no v2 value, a legacy v1 value (if any) is migrated; the v1 key itself is never modified.
 */
export function readAnswersV2(raw: string | null, legacyRaw: string | null = null): Answer[] {
  if (raw) return parseAnswersV2(JSON.parse(raw));
  if (legacyRaw) return migrateLegacyAnswers(readAnswers(legacyRaw));
  return STARTER_ANSWERS.map((a) => ({ ...a, overrides: {} }));
}

/** The text the agent would use for a market: its override, else the default, else empty. */
export function answerFor(answer: Pick<Answer, 'default' | 'overrides'>, marketCode?: string): string {
  const override = marketCode ? answer.overrides[marketCode] : undefined;
  if (override?.trim()) return override;
  return answer.default.trim() ? answer.default : '';
}

export const hasOverride = (answer: Pick<Answer, 'overrides'>, marketCode: string): boolean =>
  Boolean(answer.overrides[marketCode]?.trim());

/** Questions with at least a default answer. This is the number shown on the tab. */
export const answeredCount = (answers: readonly Answer[]): number => answers.filter((a) => a.default.trim()).length;

export interface AnswerMarket {
  code: string;
  name: string;
  home: boolean;
  workAuth: Market['workAuth'];
  currency?: string;
  salary?: MarketSalary;
}

/** The countries answers can differ by: the home country first (derived, "can work"), then each stored market. */
export function answerMarkets(
  profile: Pick<PersonalProfile, 'countryCode'>,
  markets: readonly Market[],
): AnswerMarket[] {
  const homeCode = profile.countryCode || undefined;
  const out: AnswerMarket[] = [];
  const stored = homeCode ? markets.find((m) => m.code === homeCode) : undefined;
  if (homeCode && !stored)
    out.push({
      code: homeCode,
      name: countryName(homeCode) ?? homeCode,
      home: true,
      workAuth: 'authorized',
    });
  const ordered = homeCode
    ? [...markets].sort((a, b) => Number(b.code === homeCode) - Number(a.code === homeCode))
    : markets;
  for (const m of ordered)
    out.push({
      code: m.code,
      name: countryName(m.code) ?? m.code,
      home: m.code === homeCode,
      workAuth: m.workAuth,
      currency: m.currency,
      salary: m.salary,
    });
  return out;
}

export const AUTHORIZATION_QUESTION = 'Are you authorized to work here?';
export const SALARY_QUESTION = 'Expected salary';

export const authorizationAnswer = (workAuth: Market['workAuth']) =>
  workAuth === 'authorized' ? 'Yes' : 'Need visa sponsorship';

export const START_QUESTION = 'When can you start?';

/** "Immediately", "2 weeks' notice", "From 1 Dec 2026". Empty until Notice is set. */
export const startAnswer = (profile: Pick<PersonalProfile, 'notice'>): string =>
  profile.notice ? noticeAnswer(profile.notice) : '';

export type SalaryResolution =
  /** A figure to send. */
  | { status: 'set'; text: string; source: 'market' | 'profile' }
  /** Nothing can be sent for this market. `currency` is what the missing amount must be in ('' if unknown). */
  | { status: 'missing'; currency: string };

/**
 * "Expected salary" for one market. An amount is never reused across currencies and never converted:
 * 1. the market's own salary (in the market currency), else
 * 2. the profile salary, but only when its currency is the market's currency, else
 * 3. missing: the owner must add an amount in the market currency.
 * Without a market, the profile salary in the profile currency.
 */
export function resolveSalary(
  profile: Pick<PersonalProfile, 'salaryAmount' | 'salaryPeriod' | 'salaryCurrency' | 'countryCode'>,
  market?: Pick<AnswerMarket, 'currency' | 'salary'>,
): SalaryResolution {
  const profileCurrency = effectiveSalaryCurrency(profile);
  const currency = market?.currency || profileCurrency;
  if (market?.salary)
    return {
      status: 'set',
      source: 'market',
      text: formatSalary(market.salary.amount, market.salary.period, currency || undefined),
    };
  if (profile.salaryAmount !== null && currency === profileCurrency)
    return {
      status: 'set',
      source: 'profile',
      text: formatSalary(profile.salaryAmount, profile.salaryPeriod, profileCurrency || undefined),
    };
  return { status: 'missing', currency };
}

/** The text of `resolveSalary`, or '' when nothing can be sent. */
export function salaryAnswer(
  profile: Parameters<typeof resolveSalary>[0],
  market?: Parameters<typeof resolveSalary>[1],
): string {
  const r = resolveSalary(profile, market);
  return r.status === 'set' ? r.text : '';
}

/**
 * Counts for the footer and the tab badge. The three derived questions are included, so the number matches
 * the questions on screen: authorization counts once a country exists, salary once any figure can be sent,
 * and the start date once Notice is set.
 */
export function answerSummary(
  answers: readonly Answer[],
  markets: readonly AnswerMarket[],
  profile: Parameters<typeof resolveSalary>[0] & Pick<PersonalProfile, 'notice'>,
): { answered: number; total: number } {
  const salarySet = markets.length
    ? markets.some((m) => resolveSalary(profile, m).status === 'set')
    : resolveSalary(profile).status === 'set';
  const derivedAnswered = (markets.length > 0 ? 1 : 0) + (salarySet ? 1 : 0) + (profile.notice ? 1 : 0);
  const derivedTotal = (markets.length > 0 ? 1 : 0) + 2;
  return { answered: answeredCount(answers) + derivedAnswered, total: answers.length + derivedTotal };
}
