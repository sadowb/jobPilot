import { isIP } from 'node:net';
import { fetch } from 'undici';
import { z } from 'zod';
import { PostingFormSchema, type PostingFormDto, type PostingQuestionDto } from '../../../../shared/dto';
import { canonicalKey } from '../canonical';

export const UA = 'JobPilot/0.1 (+https://github.com/sadowb/jobPilot; public job posting reader)';
export const Obj = z.record(z.string(), z.unknown());
export type Dict = Record<string, unknown>;
export const asObject = (value: unknown): Dict => (Obj.safeParse(value).success ? (value as Dict) : {});
export const str = (value: unknown, max = 30000): string | null =>
  typeof value === 'string' && value.trim()
    ? decodeEntities(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : null;
export const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|lt|gt|quot|apos|nbsp|amp);/gi, (match, entity: string) => {
    const named: Record<string, string> = { lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', amp: '&' };
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? match;
    const code =
      entity[1]?.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}
export const titleFrom = (slug: string): string =>
  slug
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const fieldType = (value: unknown): PostingQuestionDto['type'] => {
  const type = String(value ?? '').toLowerCase();
  if (type === 'multi_value_single_select') return 'select';
  if (type === 'multi_value_multi_select' || type === 'multiple') return 'multiselect';
  if (type === 'valueselect') return 'select';
  if (type === 'multivalueselect') return 'multiselect';
  if (type === 'input_file') return 'file';
  if (type === 'input_text') return 'text';
  if (['textarea', 'paragraph', 'longtext', 'essay'].includes(type)) return 'textarea';
  if (['select', 'dropdown', 'radio', 'values', 'boolean', 'multiselect', 'multiple'].includes(type))
    return type === 'radio' ? 'radio' : ['multiselect', 'multiple'].includes(type) ? 'multiselect' : 'select';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'file') return 'file';
  if (type === 'date') return 'date';
  if (type === 'number') return 'number';
  return 'text';
};

export function question(
  id: unknown,
  label: unknown,
  type: unknown,
  required: unknown,
  options: unknown,
  position: number,
): PostingQuestionDto | null {
  const external_id = str(id, 300);
  const cleanLabel = str(label, 400);
  if (!external_id || !cleanLabel) return null;
  const opts = arr(options)
    .map((v) =>
      typeof v === 'string' || typeof v === 'number'
        ? String(v)
        : str(asObject(v).label ?? asObject(v).value ?? asObject(v).text, 200),
    )
    .filter((v): v is string => !!v)
    .slice(0, 500);
  return {
    external_id,
    label: cleanLabel,
    type: fieldType(type),
    required: required === true || required === 1,
    options: [...new Set(opts)],
    position,
    canonical_key: canonicalKey(`${cleanLabel} ${external_id}`),
  };
}

export function canonicalUrl(input: string): URL {
  const u = new URL(input);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
    throw new Error('Only public HTTP(S) posting URLs are supported');
  const ip = u.hostname.replace(/^\[|\]$/g, '');
  if (
    u.hostname === 'localhost' ||
    u.hostname.endsWith('.localhost') ||
    u.hostname.endsWith('.local') ||
    isIP(ip) !== 0
  )
    throw new Error('Local URLs are not supported');
  u.hash = '';
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_|gh_src$|lever-source$|source$|ref$)/i.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  return u;
}

export async function request(
  url: string,
  init: { method?: 'GET' | 'POST'; body?: string; accept?: string } = {},
): Promise<string> {
  let target = canonicalUrl(url);
  for (let redirects = 0; redirects <= 3; redirects++) {
    let response;
    for (let attempt = 0; ; attempt++) {
      try {
        response = await fetch(target, {
          method: init.method ?? 'GET',
          body: init.body,
          headers: {
            'user-agent': UA,
            accept: init.accept ?? 'application/json, text/html;q=0.9',
            ...(init.body ? { 'content-type': 'application/json' } : {}),
          },
          signal: AbortSignal.timeout(9000),
          redirect: 'manual',
        });
        if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt >= 2) break;
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      } catch (error) {
        if (attempt >= 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new Error(`HTTP redirect limit/status ${response.status}`);
      target = canonicalUrl(new URL(location, target).href);
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${target.hostname}`);
    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new Error('Posting response exceeds 2 MB');
      }
      chunks.push(chunk.value);
    }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(output);
  }
  throw new Error('Too many redirects');
}

export async function json(
  url: string,
  schema: z.ZodType,
  init?: { method?: 'GET' | 'POST'; body?: string },
): Promise<Dict> {
  return asObject(await jsonValue(url, schema, init));
}

export async function jsonValue(
  url: string,
  schema: z.ZodType,
  init?: { method?: 'GET' | 'POST'; body?: string },
): Promise<unknown> {
  const raw: unknown = JSON.parse(await request(url, init));
  return schema.parse(raw);
}

export function form(input: Omit<PostingFormDto, 'questions'> & { questions?: PostingQuestionDto[] }): PostingFormDto {
  return PostingFormSchema.parse({ ...input, questions: input.questions ?? [] });
}

export function salaryRange(input: unknown): {
  salary: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
} {
  const d = asObject(input);
  const minValue = typeof d.min === 'string' && d.min.trim() ? Number(d.min) : d.min;
  const maxValue = typeof d.max === 'string' && d.max.trim() ? Number(d.max) : d.max;
  const min = typeof minValue === 'number' && Number.isFinite(minValue) ? Math.round(minValue) : null;
  const max = typeof maxValue === 'number' && Number.isFinite(maxValue) ? Math.round(maxValue) : null;
  const currency = typeof d.currency === 'string' && /^[A-Za-z]{3}$/.test(d.currency) ? d.currency.toUpperCase() : null;
  const salary =
    min !== null || max !== null
      ? `${currency ?? ''} ${min ?? ''}${min !== null && max !== null ? '–' : ''}${max ?? ''}`.trim()
      : str(d.value ?? input, 500);
  return { salary, salary_min: min, salary_max: max, salary_currency: currency };
}
