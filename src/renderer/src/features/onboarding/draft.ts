import type { CapFact, CvExtraction, ProfileSave } from '../../../../shared/dto';
import type { Answer } from '../profile/answers';
import { PRESENT } from '../profile/career';
import { matchLanguage, type LanguageLevel } from '../profile/languages';
import { EU_CODE, countryName, type Market, type WorkAuth } from '../profile/markets';
import { EMPTY_PROFILE, emailProblem, type PersonalProfile } from '../profile/personal';
import { normalizePhone, parsePhone, phoneProblem } from '../profile/phones';

/**
 * What Cap read from the CV plus what the owner told it, held in memory until they press the final button.
 * Nothing here is saved before then; `toSaves` is the only way it reaches the profile.
 */
export interface Draft {
  personal: PersonalProfile;
  /** Values the agent was unsure of; the chat asks about these and the panel marks them. */
  flagged: readonly FlagKey[];
  nationalities: readonly string[];
  markets: readonly Market[];
  /** Markets whose work rights the owner (or their CV) settled. */
  rightsSettled: readonly string[];
}
export type FlagKey = 'name' | 'email' | 'phone' | 'location' | 'languages' | 'markets' | 'nationality';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const isCountry = (code: string) => code !== EU_CODE && countryName(code) !== undefined;
const upper = (code: string) => code.trim().toUpperCase();
const uniq = <T>(items: readonly T[]) => [...new Set(items)];

export const EMPTY_DRAFT: Draft = {
  personal: EMPTY_PROFILE,
  flagged: [],
  nationalities: [],
  markets: [],
  rightsSettled: [],
};

/** Maps the validated agent output to a draft. Unusable values (bad dates, unknown countries) are dropped, never guessed. */
export function draftFromExtraction(x: CvExtraction): Draft {
  const flagged: FlagKey[] = [];
  const flag = (key: FlagKey, confidence: 'high' | 'low', unusable = false) => {
    if (confidence === 'low' || unusable) flagged.push(key);
  };
  const email = x.email.value.trim();
  const phoneRaw = x.phone.value.trim();
  const phoneOk = phoneRaw !== '' && phoneProblem(phoneRaw) === null;
  const countryCode = upper(x.countryCode.value);
  const home = isCountry(countryCode) ? countryCode : '';
  const career = x.career.value.flatMap((job) => {
    const start = job.start.trim();
    const end = job.end.trim().toLowerCase() === PRESENT ? PRESENT : job.end.trim();
    const endOk = end === PRESENT || (MONTH.test(end) && end >= start);
    return job.role && job.organisation && MONTH.test(start) && endOk
      ? [{ id: crypto.randomUUID(), role: job.role, organisation: job.organisation, start, end }]
      : [];
  });
  const languages = x.languages.value
    .filter((entry) => entry.language.trim())
    .map((entry) => {
      const code = matchLanguage(entry.language);
      return code
        ? { id: crypto.randomUUID(), language: code, level: entry.level }
        : { id: crypto.randomUUID(), language: '', level: entry.level, raw: entry.language.trim() };
    });
  const school = x.education.value[0];
  flag('name', x.firstName.confidence === 'low' || x.lastName.confidence === 'low' ? 'low' : 'high');
  flag('email', x.email.confidence, email !== '' && emailProblem(email) !== null);
  flag('phone', x.phone.confidence, phoneRaw !== '' && !phoneOk);
  flag('location', x.countryCode.confidence, home === '');
  flag(
    'languages',
    x.languages.confidence,
    languages.some((l) => l.level === ''),
  );
  flag('markets', x.markets.confidence);
  const nationalities = uniq(x.nationalities.value.map(upper).filter(isCountry));
  if (x.nationalities.confidence === 'low' && nationalities.length) flagged.push('nationality');
  const markets = uniq(x.markets.value.map(upper).filter((c) => isCountry(c) || c === EU_CODE)).map((code): Market => ({
    code,
    workAuth: code === home || nationalities.includes(code) ? 'authorized' : 'sponsorship',
  }));
  return {
    personal: {
      ...EMPTY_PROFILE,
      firstName: x.firstName.value,
      lastName: x.lastName.value,
      headline: x.headline.value,
      email: email && emailProblem(email) === null ? email : '',
      phone: phoneOk ? normalizePhone(phoneRaw) : '',
      city: x.city.value,
      countryCode: home,
      country: home ? (countryName(home) ?? '') : '',
      school: school?.school ?? '',
      degree: school?.degree ?? '',
      fieldOfStudy: school?.fieldOfStudy ?? '',
      graduation: school?.graduation ?? '',
      career,
      languages,
    },
    flagged: uniq(flagged),
    nationalities,
    markets,
    rightsSettled: markets.filter((m) => m.code === home || nationalities.includes(m.code)).map((m) => m.code),
  };
}

export const homeCountry = (draft: Draft): string => draft.personal.countryCode;

/** The calling code the agent's number implies, for the "+212 looks right" question. */
export const phoneRegion = (draft: Draft): string | null => parsePhone(draft.personal.phone).region ?? null;

export const setMarkets = (draft: Draft, markets: readonly Market[]): Draft => ({
  ...draft,
  markets,
  rightsSettled: draft.rightsSettled.filter((code) => markets.some((m) => m.code === code)),
});

/** Adds or removes a market. A country the owner lives in or holds a passport for is settled; any other waits for the visa question. */
export function toggleMarket(draft: Draft, code: string): Draft {
  if (draft.markets.some((m) => m.code === code))
    return setMarkets(
      draft,
      draft.markets.filter((m) => m.code !== code),
    );
  const own = code === draft.personal.countryCode || draft.nationalities.includes(code);
  const added = setMarkets(draft, [...draft.markets, { code, workAuth: own ? 'authorized' : 'sponsorship' }]);
  return own ? { ...added, rightsSettled: uniq([...added.rightsSettled, code]) } : added;
}

export const setRight = (draft: Draft, code: string, workAuth: WorkAuth): Draft => ({
  ...draft,
  markets: draft.markets.map((m) => (m.code === code ? { ...m, workAuth } : m)),
  rightsSettled: uniq([...draft.rightsSettled, code]),
});

export const setLanguageLevel = (draft: Draft, id: string, level: LanguageLevel): Draft => ({
  ...draft,
  personal: { ...draft.personal, languages: draft.personal.languages.map((l) => (l.id === id ? { ...l, level } : l)) },
});

/** Applies facts main already validated against the allow-list; unknown countries are dropped here too. */
export function applyFacts(draft: Draft, facts: readonly CapFact[]): Draft {
  let next = draft;
  for (const fact of facts) {
    const code = 'code' in fact ? upper(fact.code) : '';
    if (fact.kind === 'language') {
      const language = matchLanguage(fact.language);
      if (!language) continue;
      const known = next.personal.languages.some((l) => l.language === language);
      next = {
        ...next,
        personal: {
          ...next.personal,
          languages: known
            ? next.personal.languages.map((l) => (l.language === language ? { ...l, level: fact.level } : l))
            : [...next.personal.languages, { id: crypto.randomUUID(), language, level: fact.level }],
        },
      };
    } else if (!isCountry(code) && !(fact.kind === 'market' && code === EU_CODE)) {
      continue;
    } else if (fact.kind === 'market') {
      if (!next.markets.some((m) => m.code === code))
        next = setMarkets(next, [...next.markets, { code, workAuth: 'sponsorship' }]);
    } else if (fact.kind === 'work_auth') {
      if (next.markets.some((m) => m.code === code)) next = setRight(next, code, fact.value);
    } else {
      next = { ...next, nationalities: uniq([...next.nationalities, code]) };
    }
  }
  return next;
}

export type Ask =
  | { kind: 'phone' }
  | { kind: 'language'; id: string; name: string }
  | { kind: 'markets' }
  | { kind: 'rights'; code: string }
  | { kind: 'jobs' };

/** The next thing Cap still needs, in order. Jobs are last and optional. */
export function nextAsk(draft: Draft, resolved: ReadonlySet<string>, name: (id: string) => string): Ask | null {
  if (draft.flagged.includes('phone') && draft.personal.phone && !resolved.has('phone')) return { kind: 'phone' };
  const language = draft.personal.languages.find((l) => l.language && l.level === '' && !resolved.has(`lang:${l.id}`));
  if (language) return { kind: 'language', id: language.id, name: name(language.language) };
  if (!resolved.has('markets')) return { kind: 'markets' };
  const pending = draft.markets.find((m) => !draft.rightsSettled.includes(m.code));
  if (pending) return { kind: 'rights', code: pending.code };
  return resolved.has('jobs') ? null : { kind: 'jobs' };
}

/** Required questions left (jobs are optional). Drives "N quick answers left". */
export function requiredLeft(draft: Draft, resolved: ReadonlySet<string>, name: (id: string) => string): number {
  let count = 0;
  const seen = new Set(resolved);
  for (let guard = 0; guard < 100; guard++) {
    const ask = nextAsk(draft, seen, name);
    if (!ask || ask.kind === 'jobs') break;
    count++;
    seen.add(
      ask.kind === 'phone'
        ? 'phone'
        : ask.kind === 'language'
          ? `lang:${ask.id}`
          : ask.kind === 'markets'
            ? 'markets'
            : '',
    );
    if (ask.kind === 'rights') draft = setRight(draft, ask.code, 'sponsorship');
  }
  return count;
}

/** Share of the profile's facts present, for the ring. */
export function completeness(draft: Draft): number {
  const p = draft.personal;
  const parts = [
    p.firstName && p.lastName,
    p.email || p.phone,
    p.countryCode,
    p.career.length,
    p.school,
    p.languages.length,
    draft.markets.length,
    draft.markets.length > 0 && draft.markets.every((m) => draft.rightsSettled.includes(m.code)),
  ];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}

/** The ordered saves that commit a confirmed draft. Each is the same payload the Profile page sends. */
export function toSaves(draft: Draft): ProfileSave[] {
  const answers: Answer[] = [];
  if (draft.nationalities.length)
    answers.push({
      id: 'nationality',
      question: 'What is your nationality?',
      default: draft.nationalities.map((c) => countryName(c) ?? c).join(', '),
      overrides: {},
    });
  // Work authorisation per country is derived from `markets[].workAuth` (answers.ts), so it needs no answer row here.
  return [
    { section: 'personal', value: draft.personal },
    { section: 'markets', value: [...draft.markets] },
    { section: 'answers', value: answers },
  ];
}
