import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { FillPlanDto, FillPlanEntry, ProfileData } from '../../../shared/dto';
import { toCountryCode } from './ats/common';
import type { AtsFormField, AtsFormSchema } from './ats/schema';
import { canonicalKey } from './canonical';

/** Everything a plan may be built from. Precedence: the owner's answers, the confirmed profile, the answer library, the CV. */
export interface PlanContext {
  profile: ProfileData;
  cv: { fileName: string; text: string | null } | null;
  /** answer_library rows by canonical key. */
  library: ReadonlyMap<string, string>;
  /** The owner's answers to this application's earlier questions, by field name. */
  owner: ReadonlyMap<string, string>;
  /** Alpha-2 country of the posting, when its location names one. */
  postingCountry: string | null;
}

type Candidate = { value: string; source: NonNullable<FillPlanEntry['source']> };

const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+]+/gu, ' ')
    .trim();
const present = (value: string | null | undefined): string | null => (value && value.trim() ? value.trim() : null);

const YES = new Set(['yes', 'true', 'y']);
const NO = new Set(['no', 'false', 'n']);

/** Maps a free value onto one of the form's allowed labels, or null when none fits unambiguously. */
export function matchOption(value: string, options: readonly string[]): string | null {
  const wanted = norm(value);
  if (!wanted) return null;
  const exact = options.find((option) => norm(option) === wanted);
  if (exact) return exact;
  const polarity = YES.has(wanted) ? YES : NO.has(wanted) ? NO : null;
  if (polarity) {
    const hit = options.filter((option) => polarity.has(norm(option)));
    return hit.length === 1 ? hit[0]! : null;
  }
  if (wanted.length < 3) return null;
  const loose = options.filter((option) => {
    const candidate = norm(option);
    return candidate.includes(wanted) || (candidate.length >= 3 && wanted.includes(candidate));
  });
  return loose.length === 1 ? loose[0]! : null;
}

/** Half-open numeric range an option label stands for ("2-5" -> [2,6), "5+" -> [5,inf), "0" -> [0,1)). */
function optionRange(option: string): [number, number] | null {
  const text = option.toLowerCase().trim();
  let m = text.match(/^(?:less than|under|fewer than|<)\s*(\d+(?:\.\d+)?)/);
  if (m) return [0, Number(m[1])];
  m = text.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/);
  if (m) return [Number(m[1]), Number(m[2]) + 1];
  m = text.match(/^(?:more than|over|>)\s*(\d+(?:\.\d+)?)/);
  if (m) return [Number(m[1]), Infinity];
  m = text.match(/^(\d+(?:\.\d+)?)\s*(?:\+|plus|or more)/);
  if (m) return [Number(m[1]), Infinity];
  m = text.match(/^(\d+(?:\.\d+)?)(?:\s*(?:years?|yrs?))?$/);
  if (m) return [Number(m[1]), Number(m[1]) + 1];
  return null;
}

/** The option whose numeric range holds `amount`; where ranges touch ("2-5" and "5+") the one starting highest wins. */
export function mapNumberToOption(amount: number, options: readonly string[]): string | null {
  let best: { option: string; min: number } | null = null;
  for (const option of options) {
    const range = optionRange(option);
    if (!range || amount < range[0] || amount >= range[1]) continue;
    if (!best || range[0] > best.min) best = { option, min: range[0] };
  }
  return best?.option ?? null;
}

/** Total years of work across the profile's career, overlapping spells counted once. */
export function careerYears(profile: ProfileData, now = new Date()): number | null {
  const career = profile.personal?.career ?? [];
  if (career.length === 0) return null;
  const index = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return y! * 12 + (m! - 1);
  };
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const spans = career
    .map((c) => [index(c.start), c.end === 'present' ? nowIndex : index(c.end) + 1] as const)
    .sort((a, b) => a[0] - b[0]);
  let months = 0;
  let [from, to] = spans[0]!;
  for (const [start, end] of spans.slice(1)) {
    if (start <= to) to = Math.max(to, end);
    else {
      months += to - from;
      [from, to] = [start, end];
    }
  }
  months += to - from;
  return months / 12;
}

const COUNTRY_ALIASES: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  'u s': 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  'u k': 'GB',
};

/** The country a question is about ("authorized to work in the United States"), if the label names a known one. */
function labelCountry(label: string, codes: readonly string[]): string | null {
  const text = ` ${norm(label)} `;
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) if (text.includes(` ${alias} `)) return code;
  for (const code of codes) {
    const name = new Intl.DisplayNames('en', { type: 'region' }).of(code);
    if (name && text.includes(` ${norm(name)} `)) return code;
  }
  return null;
}

const CV_PATTERNS = {
  email: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/,
  linkedin: /(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\/[\w%-]+/i,
  github: /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i,
};
function fromCv(text: string | null | undefined, kind: keyof typeof CV_PATTERNS): string | null {
  const hit = text?.match(CV_PATTERNS[kind])?.[0];
  if (!hit) return null;
  return kind === 'email' || /^https?:\/\//i.test(hit) ? hit : `https://${hit}`;
}

const OPEN_ENDED =
  /\b(why|what excites|excites you|tell us|describe|motivat|interest(?:ed)? in|cover letter|about yourself)\b/i;

const DEGREES: Array<[RegExp, string]> = [
  [/\bm\.?b\.?a\b|master of business/i, 'Master of Business Administration (M.B.A.)'],
  [/ph\.?d|doctor(ate)? of philosophy/i, 'Doctor of Philosophy (Ph.D.)'],
  [/\bj\.?d\b|juris doctor/i, 'Juris Doctor (J.D.)'],
  [/\bm\.?d\b|doctor of medicine/i, 'Doctor of Medicine (M.D.)'],
  [/master|\bm\.?sc?\b|\bm\.?a\b|\bmeng\b|\bmsc\b/i, "Master's Degree"],
  [/bachelor|\bb\.?sc?\b|\bb\.?a\b|\bbeng\b|licen[cs]e|\bbsc\b/i, "Bachelor's Degree"],
  [/associate/i, "Associate's Degree"],
  [/high school|baccalaur|secondary/i, 'High School'],
];

/** "BSc Computer Science" -> "Bachelor's Degree"; the form's own labels are only ever returned, never invented. */
export function degreeOption(text: string, options: readonly string[]): string | null {
  const direct = matchOption(text, options);
  if (direct) return direct;
  const label = DEGREES.find(([pattern]) => pattern.test(text))?.[1];
  return label ? matchOption(label, options) : null;
}

/** A month the profile holds ("2024-06", "06/2024", "June 2024", "2024") as YYYY-MM, or the bare year. */
export function monthValue(text: string | null | undefined): { value: string; yearOnly: boolean } | null {
  const t = text?.trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})/);
  if (m) return { value: `${m[1]}-${m[2]}`, yearOnly: false };
  m = t.match(/^(\d{1,2})[/.](\d{4})$/);
  if (m) return { value: `${m[2]}-${m[1]!.padStart(2, '0')}`, yearOnly: false };
  m = t.match(/^([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (m) {
    const index = new Date(`${m[1]} 1, 2000`).getMonth();
    if (!Number.isNaN(index)) return { value: `${m[2]}-${String(index + 1).padStart(2, '0')}`, yearOnly: false };
  }
  m = t.match(/^(\d{4})$/);
  return m ? { value: m[1]!, yearOnly: true } : null;
}

function resolveEducation(field: AtsFormField, ctx: PlanContext): Candidate | null {
  const personal = ctx.profile.personal;
  const own = (value: string | null | undefined): Candidate | null => {
    const v = present(value);
    return v ? { value: v, source: 'profile' } : null;
  };
  switch (field.role) {
    case 'school':
      return own(personal?.school);
    case 'degree': {
      const text = present(personal?.degree);
      const option = text ? (field.options.length ? degreeOption(text, field.options) : text) : null;
      return option ? { value: option, source: 'profile' } : null;
    }
    case 'discipline':
      return own(personal?.fieldOfStudy);
    case 'education_start':
      return own(monthValue(personal?.schoolStart)?.value);
    case 'education_end':
      return own(monthValue(personal?.graduation)?.value);
    default:
      return null;
  }
}

const CONDITIONAL = /^\s*(?:if|when)\s+(?:you|your|yes|no|so|not|applicable|the answer|selected|other)\b/i;

function resolveText(field: AtsFormField, ctx: PlanContext): Candidate | null {
  const personal = ctx.profile.personal;
  const profile = (value: string | null | undefined): Candidate | null => {
    const v = present(value);
    return v ? { value: v, source: 'profile' } : null;
  };
  const cv = (value: string | null): Candidate | null => (value ? { value, source: 'cv' } : null);
  const libraryFor = (key: string | null): Candidate | null => {
    const v = key ? present(ctx.library.get(key)) : null;
    return v ? { value: v, source: 'library' } : null;
  };

  switch (field.name) {
    case 'first_name':
      return profile(personal?.firstName);
    case 'last_name':
      return profile(personal?.lastName);
    case 'preferred_name':
      return profile(personal?.preferredName || personal?.firstName);
    case 'email':
      return profile(personal?.email) ?? cv(fromCv(ctx.cv?.text, 'email'));
    default:
  }

  if (
    field.role === 'school' ||
    field.role === 'degree' ||
    field.role === 'discipline' ||
    field.role?.startsWith('education_')
  )
    return resolveEducation(field, ctx);

  const text = `${field.label} ${field.name}`;
  const key = canonicalKey(text);
  const countries = ctx.profile.markets.map((m) => m.code);

  if (/years?.*experience|experience.*years?/i.test(field.label)) {
    const years = careerYears(ctx.profile);
    if (years !== null) {
      const option = field.options.length ? mapNumberToOption(years, field.options) : null;
      if (option) return { value: option, source: 'derived' };
      if (!field.options.length) return { value: String(Math.floor(years)), source: 'derived' };
    }
    return libraryFor(key);
  }
  if (key === 'work_authorization' || key === 'requires_sponsorship') {
    const country = labelCountry(field.label, countries) ?? ctx.postingCountry;
    const market = country ? ctx.profile.markets.find((m) => m.code === country) : undefined;
    if (market) {
      const authorized = market.workAuth === 'authorized';
      return { value: (key === 'work_authorization' ? authorized : !authorized) ? 'Yes' : 'No', source: 'profile' };
    }
    return null;
  }
  if (key === 'linkedin_url') return profile(personal?.linkedin) ?? cv(fromCv(ctx.cv?.text, 'linkedin'));
  if (key === 'website_url') return profile(personal?.website) ?? libraryFor(key);
  if (/github/i.test(text)) return profile(personal?.github) ?? cv(fromCv(ctx.cv?.text, 'github'));
  if (key === 'notice_period') {
    const notice = personal?.notice;
    const own = notice
      ? profile(notice.kind === 'period' ? `${notice.days} days` : `Available from ${notice.iso}`)
      : profile(personal?.startDate);
    return own ?? libraryFor(key);
  }
  if (key === 'salary_expectation') {
    const own =
      personal?.salaryAmount != null
        ? profile(`${personal.salaryAmount} ${personal.salaryCurrency} per ${personal.salaryPeriod}`.replace('  ', ' '))
        : profile(personal?.salary);
    return own ?? libraryFor(key);
  }
  if (field.kind === 'text' && /^(current )?(location|city)\b/i.test(field.label)) {
    const place = [personal?.city, personal?.region, personal?.country].map(present).filter(Boolean).join(', ');
    return profile(place);
  }
  // The owner's common answers (Profile -> Answers), matched on what they are about, then the library.
  if (key) {
    for (const answer of ctx.profile.answers ?? []) {
      if (canonicalKey(answer.question) !== key) continue;
      const value = (ctx.postingCountry && answer.overrides[ctx.postingCountry]) || answer.default;
      if (present(value)) return { value: value.trim(), source: 'profile' };
    }
  }
  return libraryFor(key);
}

const HINTS: Record<string, string> = {
  typeahead:
    'Autocomplete: click the control, type the first letters, wait for the list, click the suggestion that matches exactly.',
  school: 'Autocomplete: type the first letters of the school, then click the option whose text equals the value.',
  degree: 'Dropdown: open it and click the option whose text equals the value.',
  discipline: 'Autocomplete: type the first letters, then click the option whose text equals the value.',
  education_start: 'Month and year; use the form’s month and year controls.',
  education_end: 'Month and year; use the form’s month and year controls.',
};

/** The phone number split for a country selector: deterministic from the confirmed profile, never from the CV (#233). */
function phoneEntry(
  field: AtsFormField,
  entry: (rest: Partial<FillPlanEntry> & Pick<FillPlanEntry, 'action'>) => FillPlanEntry,
  ctx: PlanContext,
): FillPlanEntry {
  const raw = present(ctx.profile.personal?.phone);
  const parsed = raw
    ? parsePhoneNumberFromString(raw, (ctx.profile.personal?.countryCode || undefined) as never)
    : undefined;
  if (parsed?.country && parsed.isValid()) {
    const country_name = new Intl.DisplayNames('en', { type: 'region' }).of(parsed.country) ?? parsed.country;
    return entry({
      action: 'fill',
      value: parsed.formatNational(),
      source: 'profile',
      phone: {
        country: parsed.country,
        country_name,
        calling_code: parsed.countryCallingCode,
        national: parsed.formatNational(),
        e164: parsed.number,
      },
      note: `If the form has a country selector, choose ${country_name} (+${parsed.countryCallingCode}) first, then type the national number.`,
    });
  }
  if (raw && parsed?.isValid()) return entry({ action: 'fill', value: raw, source: 'profile' });
  return entry({
    action: field.required ? 'ask' : 'skip',
    note: raw ? 'The profile phone number is not a valid international number.' : 'No phone on file.',
  });
}

/** The plan for one form: every field either has a value, is drafted, is deliberately skipped, or is asked of the owner. */
export function buildFillPlan(applicationId: string, schema: AtsFormSchema, input: PlanContext): FillPlanDto {
  const entries: FillPlanEntry[] = [];
  // A form that names its country anywhere ("authorized to work in the United States") speaks of it everywhere.
  const codes = input.profile.markets.map((m) => m.code);
  const named = schema.fields.map((f) => labelCountry(f.label, codes)).find((c) => c !== null) ?? null;
  const ctx: PlanContext = { ...input, postingCountry: input.postingCountry ?? named };
  const hasText = (name: string) => schema.fields.some((f) => f.name === name);
  for (const field of schema.fields) {
    const base = {
      field_key: field.name,
      label: field.label,
      required: field.required,
      kind: field.kind,
      ...(field.options.length ? { options: field.options } : {}),
    };
    const entry = (rest: Partial<FillPlanEntry> & Pick<FillPlanEntry, 'action'>): FillPlanEntry => ({
      ...base,
      value: null,
      source: null,
      ...rest,
    });

    if (field.role === 'resume')
      entries.push(
        ctx.cv
          ? entry({ action: 'upload_cv', value: ctx.cv.fileName, source: 'cv' })
          : entry({ action: field.required ? 'ask' : 'skip', note: 'No CV is stored. Add one in Profile.' }),
      );
    else if (field.role === 'resume_text')
      entries.push(entry({ action: 'skip', note: 'The CV file is attached instead.' }));
    else if (field.role === 'cover_letter')
      entries.push(
        entry({
          action: field.required && !hasText('cover_letter_text') ? 'ask' : 'skip',
          note: 'Use the cover letter text box.',
        }),
      );
    else if (field.role === 'cover_letter_text')
      entries.push(
        field.required
          ? entry({ action: 'draft', note: 'Write a short, truthful cover letter from the profile and CV.' })
          : entry({ action: 'skip', note: 'Optional.' }),
      );
    else if (field.role === 'phone' && !ctx.owner.has(field.name)) entries.push(phoneEntry(field, entry, ctx));
    else {
      const ownerValue = ctx.owner.get(field.name) ?? ctx.owner.get(`gh:${field.name}`);
      const found: Candidate | null = ownerValue ? { value: ownerValue, source: 'owner' } : resolveText(field, ctx);
      const choice = field.kind === 'select' || field.kind === 'multiselect' || field.options.length > 0;
      const value = found ? (choice ? matchOption(found.value, field.options) : found.value) : null;
      const hint = HINTS[field.role ?? ''] ?? (field.name === 'location' ? HINTS.typeahead : undefined);
      if (found && value)
        entries.push(entry({ action: choice ? 'select' : 'fill', value, source: found.source, note: hint }));
      else if (!field.required)
        entries.push(
          entry({ action: 'skip', note: found ? 'Does not match an option.' : 'Optional, nothing on file.' }),
        );
      else if (CONDITIONAL.test(field.label))
        entries.push(
          entry({
            action: 'skip',
            note: 'Only shown after another answer. If it appears, answer it from the profile and CV or report it with the other revealed fields.',
          }),
        );
      else if (!choice && field.kind !== 'file' && field.kind !== 'checkbox' && OPEN_ENDED.test(field.label))
        entries.push(
          entry({ action: 'draft', note: 'Write a short, truthful draft; the owner reviews it before submit.' }),
        );
      else
        entries.push(
          entry({
            action: 'ask',
            note: found ? 'The known answer is not one of the form’s options.' : 'Nothing on file answers this.',
            ...(found && field.role
              ? { question: `${field.label}: “${found.value}” is not in the form’s list. Pick the closest match.` }
              : {}),
          }),
        );
    }
  }
  return {
    application_id: applicationId,
    origin: 'ats_schema',
    entries,
    unresolved_required: entries
      .filter((e) => e.action === 'ask')
      .map(({ field_key, label }) => ({ field_key, label })),
  };
}

/** Country of a free-text location; only spelled-out names count, since "PA" is a state as often as Panama. */
export function postingCountry(location: string | null): string | null {
  const last = location?.split(',').at(-1)?.trim();
  if (!last || last.length < 3) return null;
  return COUNTRY_ALIASES[norm(last)] ?? toCountryCode(last);
}
