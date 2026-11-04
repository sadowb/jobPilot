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
  kind: 'text' | 'textarea' | 'select' | 'multiselect' | 'file' | 'checkbox' | 'date' | 'number';
  required: boolean;
  /** Visible option labels, in the order the form shows them. */
  options: string[];
  /** Standard resume / cover-letter inputs, recognised by their ATS name. */
  role: 'resume' | 'resume_text' | 'cover_letter' | 'cover_letter_text' | null;
}

export interface AtsFormSchema {
  ats: AtsKind;
  fields: AtsFormField[];
}

/** One adapter per ATS that publishes its form definition. Unknown ATSes have none and keep the page-reading path. */
export interface AtsSchemaAdapter {
  readonly ats: AtsKind;
  fetch(match: MatchedPosting): Promise<AtsFormSchema>;
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
/** Only what the plan needs; every other key (content, offices, ...) is dropped by zod. */
export const GreenhouseSchemaResponse = z.object({
  questions,
  location_questions: questions,
  compliance: z.array(z.object({ questions })).max(20).nullish(),
  demographic_questions: z.object({ questions }).nullish(),
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
  cover_letter: 'cover_letter',
  cover_letter_text: 'cover_letter_text',
};

export function parseGreenhouseSchema(raw: unknown): AtsFormSchema {
  const data = GreenhouseSchemaResponse.parse(raw);
  const groups = [
    data.questions,
    data.location_questions,
    ...(data.compliance ?? []).map((block) => block.questions),
    data.demographic_questions?.questions,
  ];
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
  if (fields.length === 0) throw new Error('Greenhouse form definition has no fields');
  return { ats: 'greenhouse', fields: fields.slice(0, MAX_SCHEMA_FIELDS) };
}

const greenhouse: AtsSchemaAdapter = {
  ats: 'greenhouse',
  async fetch(match) {
    const raw = await jsonValue(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(match.tenant!)}/jobs/${encodeURIComponent(match.jobId!)}?questions=true`,
      z.unknown(),
    );
    return parseGreenhouseSchema(raw);
  },
};

// Lever and Ashby publish similar definitions; add an adapter here and the plan builder needs no change.
const adapters: AtsSchemaAdapter[] = [greenhouse];

/** The posting's form definition, or null when its ATS has no adapter. Throws on 404, timeout or an invalid response. */
export async function fetchFormSchema(
  postingUrl: string,
  signal?: AbortSignal,
  adapterList: AtsSchemaAdapter[] = adapters,
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
      adapter.fetch(match),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Form definition request timed out')), SCHEMA_DEADLINE_MS);
        signal?.addEventListener('abort', () => reject(signal.reason ?? new Error('aborted')), { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
