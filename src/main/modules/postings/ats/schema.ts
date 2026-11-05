import { z } from 'zod';
import type { AtsKind } from '../../../../shared/dto';
import { jsonValue } from './common';
import { matchPostingUrl, type MatchedPosting } from './index';

/**
 * An application form as the ATS itself defines it, read before any browser opens. Field names are the real input
 * names, so a plan keyed by them is executed, not guessed. Everything in here came from a remote server: bounded,
 * stripped of control characters and only ever handed to the agent inside a JSON data block (#222).
 */
export interface AtsFormField {
  name: string;
  label: string;
  kind: 'text' | 'textarea' | 'select' | 'multiselect' | 'file' | 'checkbox' | 'date' | 'number' | 'typeahead';
  required: boolean;
  /** Visible option labels, in the order the form shows them. */
  options: string[];
  /** Standard resume / cover-letter inputs, recognised by their ATS name. */
  role: 'resume' | 'resume_text' | 'cover_letter' | 'cover_letter_text' | 'phone' | EducationRole | null;
}

export type EducationRole = 'school' | 'degree' | 'discipline' | 'education_start' | 'education_end';

/** What the adapter may look up besides the form itself. */
export interface SchemaHints {
  /** The owner's school, used to search the ATS's school list so the plan can offer its real spellings. */
  school?: string | null;
}

export interface AtsFormSchema {
  ats: AtsKind;
  fields: AtsFormField[];
}

/** One adapter per ATS that publishes its form definition. Unknown ATSes have none and keep the page-reading path. */
export interface AtsSchemaAdapter {
  readonly ats: AtsKind;
  fetch(match: MatchedPosting, hints?: SchemaHints): Promise<AtsFormSchema>;
}

export const MAX_SCHEMA_FIELDS = 120;
const MAX_LABEL = 300;
const MAX_OPTION = 200;
const MAX_OPTIONS = 200;
/** The plan is a pre-step of a run: a slow or dead API must cost seconds, not the run. */
export const SCHEMA_DEADLINE_MS = 15_000;

/** Control (Cc) and format (Cf: zero-width, bidi override) characters. */
const CONTROL = /[\p{Cc}\p{Cf}]/gu;
const clean = (value: unknown, max: number): string =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(CONTROL, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const Scalar = z.union([z.string().max(1000), z.number()]);
const GreenhouseField = z.object({
  name: z.string().min(1).max(200),
  type: z.string().max(60),
  values: z
    .array(z.object({ label: Scalar, value: Scalar.optional() }))
    .max(1000)
    .nullish(),
});
const GreenhouseQuestion = z.object({
  label: z.string().max(5000),
  required: z.boolean().nullish(),
  fields: z.array(GreenhouseField).max(30),
});
const questions = z.array(GreenhouseQuestion).max(300).nullish();
/** Self-identification questions have no input name: options live in `answer_options`. */
const GreenhouseDemographic = z.object({
  id: z.union([z.string().max(40), z.number()]),
  label: z.string().max(5000),
  required: z.boolean().nullish(),
  type: z.string().max(60),
  answer_options: z
    .array(z.object({ label: Scalar }))
    .max(500)
    .nullish(),
});
/** Only what the plan needs; every other key (content, offices, ...) is dropped by zod. */
export const GreenhouseSchemaResponse = z.object({
  questions,
  location_questions: questions,
  compliance: z.array(z.object({ questions })).max(20).nullish(),
  demographic_questions: z.object({ questions: z.array(GreenhouseDemographic).max(50).nullish() }).nullish(),
  education: z.string().max(60).nullish(),
});

const KINDS: Record<string, AtsFormField['kind']> = {
  input_text: 'text',
  textarea: 'textarea',
  input_file: 'file',
  multi_value_single_select: 'select',
  multi_value_multi_select: 'multiselect',
  input_hidden: 'text',
};
const ROLES: Record<string, NonNullable<AtsFormField['role']>> = {
  resume: 'resume',
  resume_text: 'resume_text',
  phone: 'phone',
  cover_letter: 'cover_letter',
  cover_letter_text: 'cover_letter_text',
};

/** The form's education block exists when the job says so; its inputs are not part of `questions`. */
const EDUCATION: Array<{ name: string; label: string; role: EducationRole; kind: AtsFormField['kind'] }> = [
  { name: 'education.school', label: 'School', role: 'school', kind: 'typeahead' },
  { name: 'education.degree', label: 'Degree', role: 'degree', kind: 'typeahead' },
  { name: 'education.discipline', label: 'Discipline', role: 'discipline', kind: 'typeahead' },
  { name: 'education.start', label: 'Start date', role: 'education_start', kind: 'date' },
  { name: 'education.end', label: 'End date', role: 'education_end', kind: 'date' },
];

export function parseGreenhouseSchema(
  raw: unknown,
  lookups: { schools?: string[]; degrees?: string[]; disciplines?: string[] } = {},
): AtsFormSchema {
  const data = GreenhouseSchemaResponse.parse(raw);
  const groups = [data.questions, data.location_questions, ...(data.compliance ?? []).map((block) => block.questions)];
  const fields: AtsFormField[] = [];
  const seen = new Set<string>();
  for (const group of groups)
    for (const question of group ?? [])
      for (const field of question.fields) {
        const name = clean(field.name, 200);
        if (!name || seen.has(name) || field.type === 'input_hidden') continue;
        seen.add(name);
        const options = [...new Set((field.values ?? []).map((v) => clean(v.label, MAX_OPTION)).filter(Boolean))].slice(
          0,
          MAX_OPTIONS,
        );
        fields.push({
          name,
          label: clean(question.label, MAX_LABEL) || name,
          kind: KINDS[field.type] ?? 'text',
          required: question.required === true,
          options,
          role: ROLES[name] ?? null,
        });
      }
  for (const question of data.demographic_questions?.questions ?? []) {
    const name = `demographic_${clean(question.id, 40)}`;
    if (seen.has(name)) continue;
    seen.add(name);
    fields.push({
      name,
      label: clean(question.label, MAX_LABEL) || name,
      kind: KINDS[question.type] ?? 'select',
      required: question.required === true,
      options: [
        ...new Set((question.answer_options ?? []).map((o) => clean(o.label, MAX_OPTION)).filter(Boolean)),
      ].slice(0, MAX_OPTIONS),
      role: null,
    });
  }
  if (data.education === 'education_required' || data.education === 'education_optional')
    for (const item of EDUCATION)
      fields.push({
        name: item.name,
        label: item.label,
        kind: item.kind,
        required: data.education === 'education_required',
        options:
          (item.role === 'school'
            ? lookups.schools
            : item.role === 'degree'
              ? lookups.degrees
              : item.role === 'discipline'
                ? lookups.disciplines
                : []
          )?.slice(0, MAX_OPTIONS) ?? [],
        role: item.role,
      });
  if (fields.length === 0) throw new Error('Greenhouse form definition has no fields');
  return { ats: 'greenhouse', fields: fields.slice(0, MAX_SCHEMA_FIELDS) };
}

const OptionList = z.object({ items: z.array(z.object({ text: z.string().max(300) })).max(1000) });
const BOARD = 'https://boards-api.greenhouse.io/v1/boards';

/** Education lookups are a nicety: a failure leaves the field without options, never fails the plan. */
async function lookup(url: string): Promise<string[]> {
  try {
    return ((await jsonValue(url, OptionList)) as z.infer<typeof OptionList>).items.map((i) =>
      clean(i.text, MAX_OPTION),
    );
  } catch {
    return [];
  }
}

/** The ATS's school list is searched, not listed: try the full name, then its longest word, then its first letters. */
async function schoolOptions(board: string, school: string): Promise<string[]> {
  const generic = /^(university|college|institute|school|academy|polytechnic|of|the|and|for|de|du|la|le)$/i;
  const longest =
    school
      .split(/\s+/)
      .filter((w) => !generic.test(w))
      .sort((a, b) => b.length - a.length)[0] ?? '';
  const terms = [...new Set([school, longest, school.slice(0, 4)].map((t) => t.trim()).filter((t) => t.length >= 3))];
  for (const term of terms) {
    const found = await lookup(`${BOARD}/${board}/education/schools?term=${encodeURIComponent(term)}`);
    if (found.length) return found;
  }
  return [];
}

const greenhouse: AtsSchemaAdapter = {
  ats: 'greenhouse',
  async fetch(match, hints) {
    const board = encodeURIComponent(match.tenant!);
    const raw = await jsonValue(
      `${BOARD}/${board}/jobs/${encodeURIComponent(match.jobId!)}?questions=true`,
      z.unknown(),
    );
    const parsed = GreenhouseSchemaResponse.parse(raw);
    if (parsed.education !== 'education_required' && parsed.education !== 'education_optional')
      return parseGreenhouseSchema(raw);
    const [degrees, disciplines, schools] = await Promise.all([
      lookup(`${BOARD}/${board}/education/degrees`),
      lookup(`${BOARD}/${board}/education/disciplines`),
      hints?.school ? schoolOptions(board, hints.school) : Promise.resolve([]),
    ]);
    return parseGreenhouseSchema(raw, { degrees, disciplines, schools });
  },
};

// Lever and Ashby publish similar definitions; add an adapter here and the plan builder needs no change.
const adapters: AtsSchemaAdapter[] = [greenhouse];

/** The posting's form definition, or null when its ATS has no adapter. Throws on 404, timeout or an invalid response. */
export async function fetchFormSchema(
  postingUrl: string,
  signal?: AbortSignal,
  adapterList: AtsSchemaAdapter[] = adapters,
  hints?: SchemaHints,
): Promise<AtsFormSchema | null> {
  let url: URL;
  try {
    url = new URL(postingUrl);
  } catch {
    return null;
  }
  const match = matchPostingUrl(url);
  const adapter = match && match.tenant && match.jobId ? adapterList.find((a) => a.ats === match.ats) : undefined;
  if (!match || !adapter) return null;
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      adapter.fetch(match, hints),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Form definition request timed out')), SCHEMA_DEADLINE_MS);
        signal?.addEventListener('abort', () => reject(signal.reason ?? new Error('aborted')), { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
