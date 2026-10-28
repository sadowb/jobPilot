import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { getCountries } from 'libphonenumber-js';
import { Agent, fetch } from 'undici';
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
const regionNames = new Intl.DisplayNames('en', { type: 'region' });
/** ISO 3166 alpha-2 codes ("us") become names ("United States"); anything else passes through. */
export const countryName = (value: string | null): string | null => {
  if (!value || !/^[A-Za-z]{2}$/.test(value)) return value;
  try {
    return regionNames.of(value.toUpperCase()) ?? value;
  } catch {
    return value;
  }
};
const countryNameMap: Map<string, string> = (() => {
  const map = new Map<string, string>();
  try {
    for (const code of getCountries()) {
      const name = regionNames.of(code);
      if (name) map.set(name.toLowerCase(), code);
    }
  } catch {
    /* fallback */
  }
  return map;
})();
/** Converts an ISO 3166-1 alpha-2 code or structured country name to uppercase alpha-2. */
export const toCountryCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    if (upper === 'ZZ') return null;
    try {
      const name = regionNames.of(upper);
      return name && name !== upper ? upper : null;
    } catch {
      return null;
    }
  }
  return countryNameMap.get(trimmed.toLowerCase()) ?? null;
};
/** Drops board-name suffixes like " - Career's Page", " Careers", " Jobs" from a company name. */
export const cleanCompany = (value: string | null): string | null =>
  value?.replace(/\s*(?:[-–—|:]\s*)?(?:career'?s?|jobs?)(?:\s+(?:page|board|site))?\s*$/i, '').trim() || value;
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
  // Pasted text often carries zero-width/format chars (\p{Cf}) and whitespace that the URL parser would percent-encode into the path.
  const u = new URL(input.replace(/[\p{Cf}\s]/gu, ''));
  if (u.protocol !== 'https:' || u.username || u.password || u.port)
    throw new Error('Only public HTTPS posting URLs without credentials or custom ports are supported');
  u.hostname = u.hostname.replace(/\.$/, '');
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

const blockedV4 = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blockedV4.addSubnet(network, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
const blockedV6 = new BlockList();
// Exclude transition mechanisms (including embedded IPv4) and documentation ranges.
blockedV6.addSubnet('2001::', 23, 'ipv6');
blockedV6.addSubnet('2001:db8::', 32, 'ipv6');
blockedV6.addSubnet('2002::', 16, 'ipv6');
blockedV6.addSubnet('3fff::', 20, 'ipv6');
const DnsAddresses = z
  .array(z.object({ address: z.union([z.ipv4(), z.ipv6()]), family: z.union([z.literal(4), z.literal(6)]) }))
  .min(1);
const atsDomains = ['greenhouse.io', 'lever.co', 'ashbyhq.com', 'workable.com', 'smartrecruiters.com', 'bamboohr.com'];

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('name' in error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return true;
  const candidate = error as { code?: unknown; cause?: unknown; message?: unknown };
  const code =
    typeof candidate.code === 'string'
      ? candidate.code
      : candidate.cause &&
          typeof candidate.cause === 'object' &&
          'code' in candidate.cause &&
          typeof candidate.cause.code === 'string'
        ? candidate.cause.code
        : undefined;
  if (code && /^(?:ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|UND_ERR)/.test(code)) return true;
  if (error instanceof TypeError && typeof candidate.message === 'string' && candidate.message.includes('fetch failed'))
    return true;
  return false;
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

export function retryDelayMs(
  response?: { headers?: Headers | { get(name: string): string | null } },
  attempt = 0,
  options?: { now?: number; random?: () => number },
): number {
  let baseMs: number | undefined;
  const header = response?.headers?.get?.('retry-after')?.trim();
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      baseMs = seconds * 1000;
    } else {
      const parsedDate = Date.parse(header);
      if (!Number.isNaN(parsedDate)) {
        const now = options?.now ?? Date.now();
        baseMs = Math.max(0, parsedDate - now);
      }
    }
  }
  if (baseMs === undefined) {
    baseMs = 250 * 2 ** attempt;
  }
  const capped = Math.min(baseMs, 30_000);
  const rand = options?.random ? options.random() : Math.random();
  const jitter = 0.8 + rand * 0.4;
  return Math.round(capped * jitter);
}

export async function request(
  url: string,
  init: {
    method?: 'GET' | 'POST';
    body?: string;
    accept?: string;
    allowCrossDomainRedirects?: boolean;
    redirects?: 'same-host-once';
  } = {},
): Promise<{ text: string; url: URL }> {
  let target = canonicalUrl(url);
  // These six ATS registrable domains are fixed; no public-suffix guessing for arbitrary sites.
  const domain = atsDomains.find((domain) => target.hostname === domain || target.hostname.endsWith(`.${domain}`));
  if (!init.allowCrossDomainRedirects && !domain) throw new Error('Unsupported ATS request host');
  const originalHost = target.hostname;
  const redirectLimit = init.redirects === 'same-host-once' ? 1 : 3;
  for (let redirects = 0; redirects <= redirectLimit; redirects++) {
    const addresses = DnsAddresses.parse(await lookup(target.hostname, { all: true }));
    if (
      addresses.some(
        ({ address, family }) =>
          isIP(address) !== family ||
          (family === 4
            ? blockedV4.check(address, 'ipv4')
            : !globalV6.check(address, 'ipv6') || blockedV6.check(address, 'ipv6')),
      )
    )
      throw new Error('Posting host resolved to a non-public address');
    const pinned = addresses[0]!;
    // A fresh dispatcher per hop prevents connection reuse from bypassing this hop's DNS check.
    const dispatcher = new Agent({
      connect: {
        autoSelectFamily: false,
        lookup: (_hostname, options, callback) => {
          callback(null, options.all ? [pinned] : pinned.address, pinned.family);
        },
      },
    });
    try {
      let response: Awaited<ReturnType<typeof fetch>>;
      for (let attempt = 0; ; attempt++) {
        try {
          response = await fetch(target, {
            dispatcher,
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
          if (!isRetryableStatus(response.status) || attempt >= 2) break;
          await response.body?.cancel();
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs(response, attempt)));
        } catch (error) {
          if (!isNetworkError(error) || attempt >= 2) throw error;
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs(undefined, attempt)));
        }
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || redirects === redirectLimit) throw new Error(`HTTP redirect limit/status ${response.status}`);
        target = canonicalUrl(new URL(location, target).href);
        if (init.redirects === 'same-host-once' && target.hostname !== originalHost)
          throw new Error('Posting redirect left its host');
        if (!init.allowCrossDomainRedirects && target.hostname !== domain && !target.hostname.endsWith(`.${domain}`))
          throw new Error('ATS redirect left its domain');
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status} for ${target.hostname}`);
      }
      const reader = response.body?.getReader();
      if (!reader) return { text: '', url: target };
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
      return { text: new TextDecoder('utf-8', { fatal: false }).decode(output), url: target };
    } finally {
      await dispatcher.destroy();
    }
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
  const raw: unknown = JSON.parse((await request(url, init)).text);
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
