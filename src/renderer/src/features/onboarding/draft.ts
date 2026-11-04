import type { CapFact, CvExtraction, ProfileSave } from '../../../../shared/dto';
import type { Answer } from '../profile/answers';
import { PRESENT } from '../profile/career';
import { languageName, matchLanguage } from '../profile/languages';
import { EU_CODE, countryName, type Market, type WorkAuth } from '../profile/markets';
import { EMPTY_PROFILE, emailProblem, type PersonalProfile } from '../profile/personal';
import { normalizePhone, phoneProblem } from '../profile/phones';

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

const YEAR = /^\d{4}$/;
const OPEN_ENDED = new Set([PRESENT, 'current', 'now', 'ongoing']);

/** A CV date as YYYY-MM; a bare year becomes January (start) or December (end). Anything else is unusable. */
function monthOf(raw: string, edge: 'start' | 'end'): string | null {
  const value = raw.trim();
  if (MONTH.test(value)) return value;
  return YEAR.test(value) ? `${value}-${edge === 'start' ? '01' : '12'}` : null;
}

/** Maps CV jobs to profile career rows. Jobs without a role, organisation or readable dates are returned in `dropped` so the owner is told, never lost silently. */
export function parseCareer(jobs: CvExtraction['career']['value']) {
  const kept: PersonalProfile['career'][number][] = [];
  const dropped: string[] = [];
  for (const job of jobs) {
    const start = monthOf(job.start, 'start');
    const rawEnd = job.end.trim().toLowerCase();
    const end = OPEN_ENDED.has(rawEnd) || rawEnd === '' ? PRESENT : monthOf(job.end, 'end');
    if (job.role && job.organisation && start && end && (end === PRESENT || end >= start))
      kept.push({ id: crypto.randomUUID(), role: job.role, organisation: job.organisation, start, end });
    else dropped.push([job.role, job.organisation].filter(Boolean).join(' at ') || 'a job');
  }
  return { kept, dropped };
}

const LINKEDIN = /^(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\/[\w%-]+\/?$/i;
/** A LinkedIn profile URL with a scheme, or null when the text is not one. */
export function linkedinUrl(raw: string): string | null {
  const value = raw.trim();
  return LINKEDIN.test(value) ? (/^https?:\/\//i.test(value) ? value : `https://${value}`) : null;
}

/** Facts the draft will refuse (and why), so Cap can say so instead of leaving the owner thinking they were saved. `key` is the matching missing-item key. */
export function rejectedFacts(facts: readonly CapFact[]): { key: string; message: string }[] {
  const out: { key: string; message: string }[] = [];
  for (const fact of facts) {
    if (fact.kind !== 'personal') continue;
    const value = fact.value.trim();
    if (fact.field === 'phone' && phoneProblem(value) !== null)
      out.push({
        key: 'phone',
        message: `I could not save the phone number "${value}": it is not a valid number (check the digits and include the country code). Could you check it?`,
      });
    else if (fact.field === 'email' && emailProblem(value) !== null)
      out.push({
        key: 'email',
        message: `I could not save the email "${value}": it is not a valid address. Could you check it?`,
      });
    else if (fact.field === 'countryCode' && !isCountry(upper(value)))
      out.push({
        key: 'location',
        message: `I could not save "${value}" as your country. Which country do you live in?`,
      });
    else if (fact.field === 'linkedin' && linkedinUrl(value) === null)
      out.push({
        key: 'linkedin',
        message: `I could not save the LinkedIn address "${value}": it should look like linkedin.com/in/your-name.`,
      });
  }
  return out;
}

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
  const { kept: career } = parseCareer(x.career.value);
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
      linkedin: linkedinUrl(x.linkedin?.value ?? '') ?? '',
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

export const setMarkets = (draft: Draft, markets: readonly Market[]): Draft => ({
  ...draft,
  markets,
  rightsSettled: draft.rightsSettled.filter((code) => markets.some((m) => m.code === code)),
});

export const setRight = (draft: Draft, code: string, workAuth: WorkAuth): Draft => ({
  ...draft,
  markets: draft.markets.map((m) => (m.code === code ? { ...m, workAuth } : m)),
  rightsSettled: uniq([...draft.rightsSettled, code]),
});

const unflag = (draft: Draft, ...keys: FlagKey[]): Draft =>
  keys.some((k) => draft.flagged.includes(k))
    ? { ...draft, flagged: draft.flagged.filter((k) => !keys.includes(k)) }
    : draft;

/** Applies a personal-field fact if the value passes the same checks as the profile form; invalid values are dropped, never guessed. */
function applyPersonal(draft: Draft, field: Extract<CapFact, { kind: 'personal' }>['field'], raw: string): Draft {
  const value = raw.trim();
  const set = (patch: Partial<PersonalProfile>, ...flags: FlagKey[]) =>
    unflag({ ...draft, personal: { ...draft.personal, ...patch } }, ...flags);
  switch (field) {
    case 'firstName':
    case 'lastName':
      return set({ [field]: value }, 'name');
    case 'linkedin': {
      const url = linkedinUrl(value);
      return url ? set({ linkedin: url }) : draft;
    }
    case 'headline':
    case 'city':
      return set({ [field]: value });
    case 'email':
      return emailProblem(value) === null ? set({ email: value }, 'email') : draft;
    case 'phone':
      return phoneProblem(value) === null ? set({ phone: normalizePhone(value) }, 'phone') : draft;
    case 'countryCode': {
      const code = upper(value);
      return isCountry(code) ? set({ countryCode: code, country: countryName(code) ?? '' }, 'location') : draft;
    }
  }
}

/** Applies facts main already validated against the allow-list; every value is re-checked here and invalid ones are dropped. */
export function applyFacts(draft: Draft, facts: readonly CapFact[]): Draft {
  let next = draft;
  for (const fact of facts) {
    if (fact.kind === 'personal') {
      next = applyPersonal(next, fact.field, fact.value);
      continue;
    }
    if (fact.kind === 'language') {
      const language = matchLanguage(fact.language);
      if (!language) continue;
      const known = next.personal.languages.some((l) => l.language === language);
      next = unflag(
        {
          ...next,
          personal: {
            ...next.personal,
            languages: known
              ? next.personal.languages.map((l) => (l.language === language ? { ...l, level: fact.level } : l))
              : [...next.personal.languages, { id: crypto.randomUUID(), language, level: fact.level }],
          },
        },
        'languages',
      );
      continue;
    }
    const code = upper(fact.code);
    if (!isCountry(code) && !(fact.kind === 'market' && code === EU_CODE)) continue;
    if (fact.kind === 'market') {
      if (fact.remove)
        next = setMarkets(
          next,
          next.markets.filter((m) => m.code !== code),
        );
      else if (!next.markets.some((m) => m.code === code))
        next = setMarkets(next, [...next.markets, { code, workAuth: 'sponsorship' }]);
      next = unflag(next, 'markets');
    } else if (fact.kind === 'work_auth') {
      if (next.markets.some((m) => m.code === code)) next = setRight(next, code, fact.value);
    } else {
      next = unflag(
        {
          ...next,
          nationalities: fact.remove
            ? next.nationalities.filter((c) => c !== code)
            : uniq([...next.nationalities, code]),
        },
        'nationality',
      );
    }
  }
  return next;
}

export interface Missing {
  key: string;
  label: string;
}

/**
 * What the app still needs, decided here and not by the agent. An item is open when its value is absent or the agent was
 * unsure of it, until a fact corrects it or the owner confirmed/declined it (`resolved` holds those keys).
 */
export function missingItems(draft: Draft, resolved: ReadonlySet<string>): Missing[] {
  const p = draft.personal;
  const open = (key: string, absent: boolean, flag?: FlagKey) =>
    !resolved.has(key) && (absent || (flag !== undefined && draft.flagged.includes(flag)));
  const items: Missing[] = [];
  const need = (key: string, label: string, absent: boolean, flag?: FlagKey) => {
    if (open(key, absent, flag)) items.push({ key, label });
  };
  need('name', 'full name (first and last)', !p.firstName || !p.lastName, 'name');
  need('email', 'email address', !p.email, 'email');
  need('phone', 'phone number with country code', !p.phone, 'phone');
  need('location', 'country where they live', !p.countryCode, 'location');
  need('nationality', 'nationality (every passport they hold)', draft.nationalities.length === 0, 'nationality');
  need('markets', 'countries they want to work in', draft.markets.length === 0, 'markets');
  for (const l of p.languages)
    if (l.level === '')
      need(
        `lang:${l.id}`,
        `how well they speak ${l.language ? languageName(l.language) : (l.raw ?? 'a language')}`,
        true,
      );
  for (const m of draft.markets)
    need(
      `rights:${m.code}`,
      `whether they can work in ${countryName(m.code) ?? m.code} without a visa`,
      !draft.rightsSettled.includes(m.code),
    );
  return items;
}

/** Plain-text summary of the draft for the agent, so it asks only about what is open. */
export function knownSummary(draft: Draft): string {
  const p = draft.personal;
  const line = (label: string, value: string) => `${label}: ${value || '(unknown)'}`;
  return [
    line('name', [p.firstName, p.lastName].filter(Boolean).join(' ')),
    line('email', p.email),
    line('phone', p.phone),
    line('lives in', [p.city, p.countryCode].filter(Boolean).join(', ')),
    line('nationalities', draft.nationalities.join(', ')),
    line(
      'languages',
      p.languages.map((l) => `${l.language || l.raw || '?'} (${l.level || 'level unknown'})`).join(', '),
    ),
    line(
      'target countries',
      draft.markets
        .map((m) => `${m.code} (${draft.rightsSettled.includes(m.code) ? m.workAuth : 'work rights unknown'})`)
        .join(', '),
    ),
  ].join('\n');
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
