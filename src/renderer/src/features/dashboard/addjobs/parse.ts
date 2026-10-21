import type { Application } from '../types';
import type { QueueItem, QueueSource } from '../upnext/queue';

export type JobSite = 'Greenhouse' | 'Ashby' | 'Lever' | 'Workday';

/** What the paste reader decided about one link. */
export type ParsedKind = 'new' | 'applied' | 'queued' | 'duplicate' | 'invalid';

export interface ParsedLink {
  /** Stable per paste: position + url, so React keys survive re-parsing the same text. */
  key: string;
  url: string;
  kind: ParsedKind;
  /** Company for job links; display name for non-job links ("Blog post"). */
  company: string;
  role: string;
  /** Site for job links; the host for non-job links. */
  site: string;
  estimateMin: number;
  /** Workday-style ATSs make the crew create a site account first. */
  createsAccount: boolean;
  /** `applied` only: ISO date the job was applied to. */
  appliedOn?: string;
  /** The role could not be resolved without opening the page; the crew reads it when it gets there. */
  roleUnresolved: boolean;
}

export interface ParsedPaste {
  links: ParsedLink[];
  toQueue: ParsedLink[];
  skipped: number;
  minutes: number;
  accounts: number;
}

interface Known {
  company: string;
  role: string;
  estimateMin?: number;
}

/**
 * Postings the app can name without a network call. Stands in for the real resolver (which reads the page);
 * unknown slugs fall back to a title-cased company and an unresolved role.
 */
const KNOWN_POSTINGS: Record<string, Known> = {
  duolingo: { company: 'Duolingo', role: 'Software Engineer, New Grad' },
  cloudflare: { company: 'Cloudflare', role: 'Software Engineer Intern → FT' },
  asana: { company: 'Asana', role: 'Software Engineer, New Grad' },
  stripe: { company: 'Stripe', role: 'Abuse Investigator' },
  capitalone: { company: 'Capital One', role: 'Associate Software Engineer', estimateMin: 50 },
  coinbase: { company: 'Coinbase', role: 'Software Engineer, New Grad' },
  mercury: { company: 'Mercury', role: 'Software Engineer, New Grad' },
  retool: { company: 'Retool', role: 'Software Engineer, Early Career' },
  figma: { company: 'Figma', role: 'Software Engineer, Early Career', estimateMin: 3 },
  brex: { company: 'Brex', role: 'Software Engineer, New Grad' },
  rippling: { company: 'Rippling', role: 'Software Engineer I' },
};

const DEFAULT_ESTIMATE_MIN = 2;
const WORKDAY_ESTIMATE_MIN = 50;
const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
// Trailing punctuation that belongs to the sentence, not the link.
const TRAILING_RE = /[)\].,;:!?]+$/;

/** All http(s) links in free text (an email, a sheet cell dump), in order of appearance. */
export function extractUrls(text: string): string[] {
  return (text.match(URL_RE) ?? []).map((u) => u.replace(TRAILING_RE, ''));
}

const titleCase = (slug: string): string =>
  slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const normCompany = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

interface Posting {
  site: JobSite;
  slug: string;
}

/** Recognises job postings on the application systems the crew can drive. Anything else is not a job page. */
export function detectPosting(raw: string): Posting | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const [first = ''] = url.pathname.split('/').filter(Boolean);
  const segments = url.pathname.split('/').filter(Boolean);
  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
    return first && segments[1] === 'jobs' ? { site: 'Greenhouse', slug: first.toLowerCase() } : null;
  }
  if (host === 'jobs.ashbyhq.com') return segments.length >= 2 ? { site: 'Ashby', slug: first.toLowerCase() } : null;
  if (host === 'jobs.lever.co') return segments.length >= 2 ? { site: 'Lever', slug: first.toLowerCase() } : null;
  if (host.endsWith('.myworkdayjobs.com')) {
    const slug = host.split('.')[0];
    return slug ? { site: 'Workday', slug } : null;
  }
  return null;
}

function hostLabel(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return raw;
  }
}

const BLOG_HOSTS = new Set(['medium.com', 'substack.com', 'dev.to', 'wordpress.com', 'blogspot.com']);

export interface PasteContext {
  applied: readonly Pick<Application, 'company' | 'appliedOn'>[];
  queued: readonly Pick<QueueItem, 'company' | 'role'>[];
}

/**
 * Reads pasted text into one row per link. A job is skipped when it was already applied to, is already in
 * Up next, repeats earlier in the same paste, or is not a job page at all.
 */
export function parsePaste(text: string, ctx: PasteContext): ParsedPaste {
  const seenUrls = new Set<string>();
  const seenJobs = new Set<string>();
  const links: ParsedLink[] = extractUrls(text).map((url, i) => {
    const key = `${i}:${url}`;
    const base = { key, url, estimateMin: 0, createsAccount: false, roleUnresolved: false };
    const posting = detectPosting(url);
    if (!posting) {
      const host = hostLabel(url);
      return {
        ...base,
        kind: 'invalid' as const,
        company: BLOG_HOSTS.has(host) ? 'Blog post' : 'Link',
        role: '',
        site: host,
      };
    }
    const known = KNOWN_POSTINGS[posting.slug];
    const company = known?.company ?? titleCase(posting.slug);
    const role = known?.role ?? '';
    const createsAccount = posting.site === 'Workday';
    const estimateMin =
      known?.estimateMin ?? (posting.site === 'Workday' ? WORKDAY_ESTIMATE_MIN : DEFAULT_ESTIMATE_MIN);
    const job = { ...base, company, role, site: posting.site, estimateMin, createsAccount, roleUnresolved: !known };

    const norm = normCompany(company);
    const jobId = `${norm}|${normCompany(role)}`;
    if (seenUrls.has(url) || seenJobs.has(jobId)) return { ...job, kind: 'duplicate' as const };
    seenUrls.add(url);
    seenJobs.add(jobId);
    const appliedHit = ctx.applied.find((a) => normCompany(a.company) === norm);
    if (appliedHit) return { ...job, kind: 'applied' as const, appliedOn: appliedHit.appliedOn };
    if (ctx.queued.some((q) => normCompany(q.company) === norm && (!role || q.role === role))) {
      return { ...job, kind: 'queued' as const };
    }
    return { ...job, kind: 'new' as const };
  });

  return summarize(links);
}

/** Totals for the links still in the list (the user can drop rows before queueing). */
export function summarize(links: ParsedLink[]): ParsedPaste {
  const toQueue = links.filter((l) => l.kind === 'new');
  return {
    links,
    toQueue,
    skipped: links.length - toQueue.length,
    minutes: toQueue.reduce((sum, l) => sum + l.estimateMin, 0),
    accounts: toQueue.filter((l) => l.createsAccount).length,
  };
}

/** Queue rows for the links the user kept. `ids` are minted by the caller so the reducer stays pure. */
export function toQueueItems(links: readonly ParsedLink[], source: QueueSource, ids: readonly string[]): QueueItem[] {
  return links.map((l, i) => ({
    id: ids[i] ?? `${normCompany(l.company)}-${l.key}`,
    company: l.company,
    role: l.role || 'Role read when opened',
    site: l.site,
    siteNote: l.createsAccount ? 'creates a site account' : undefined,
    estimateMin: l.estimateMin,
    source,
    stage: 'queued' as const,
    agent: 'idle' as const,
  }));
}

/** Board scenario: the six links the Add jobs board shows pasted. */
export const SAMPLE_PASTE = [
  'https://boards.greenhouse.io/duolingo/jobs/7100001',
  'https://boards.greenhouse.io/cloudflare/jobs/5800002',
  'https://boards.greenhouse.io/asana/jobs/6400003',
  'https://job-boards.greenhouse.io/stripe/jobs/4400004',
  'https://capitalone.wd12.myworkdayjobs.com/en-US/Capital_One/job/McLean/Associate-Software-Engineer_R1',
  'https://medium.com/@someone/how-i-got-hired-at-a-startup',
].join('\n');
