import { describe, expect, it } from 'vitest';
import {
  detectPosting,
  extractUrls,
  parsePaste,
  SAMPLE_PASTE,
  summarize,
  toQueueItems,
} from '../../src/renderer/src/features/dashboard/addjobs/parse';
import { SAMPLE_APPLICATIONS } from '../../src/renderer/src/features/dashboard/sample';
import { SAMPLE_QUEUE } from '../../src/renderer/src/features/dashboard/upnext/queue';

const emptyCtx = { applied: SAMPLE_APPLICATIONS, queued: [] };

describe('extractUrls', () => {
  it('finds links in free text and strips trailing sentence punctuation', () => {
    const text = 'Apply: https://boards.greenhouse.io/duolingo/jobs/1, also (https://jobs.lever.co/x/y). Bye!';
    expect(extractUrls(text)).toEqual(['https://boards.greenhouse.io/duolingo/jobs/1', 'https://jobs.lever.co/x/y']);
  });
  it('returns nothing for text without links', () => {
    expect(extractUrls('no links here, ftp://nope')).toEqual([]);
  });
});

describe('detectPosting', () => {
  it.each([
    ['https://boards.greenhouse.io/duolingo/jobs/71', { site: 'Greenhouse', slug: 'duolingo' }],
    ['https://job-boards.greenhouse.io/stripe/jobs/4400', { site: 'Greenhouse', slug: 'stripe' }],
    ['https://jobs.ashbyhq.com/ramp/abc-123', { site: 'Ashby', slug: 'ramp' }],
    ['https://jobs.lever.co/plaid/9f', { site: 'Lever', slug: 'plaid' }],
    ['https://capitalone.wd12.myworkdayjobs.com/en-US/x/job/y', { site: 'Workday', slug: 'capitalone' }],
  ])('recognises %s', (url, posting) => {
    expect(detectPosting(url)).toEqual(posting);
  });
  it('rejects company home pages, blogs and garbage', () => {
    expect(detectPosting('https://boards.greenhouse.io/duolingo')).toBeNull();
    expect(detectPosting('https://jobs.ashbyhq.com/ramp')).toBeNull();
    expect(detectPosting('https://medium.com/@a/post')).toBeNull();
    expect(detectPosting('not a url')).toBeNull();
  });
});

describe('parsePaste on the board paste', () => {
  const parsed = parsePaste(SAMPLE_PASTE, emptyCtx);
  it('reads 6 links: 4 to queue, 2 skipped', () => {
    expect(parsed.links).toHaveLength(6);
    expect(parsed.toQueue.map((l) => l.company)).toEqual(['Duolingo', 'Cloudflare', 'Asana', 'Capital One']);
    expect(parsed.skipped).toBe(2);
  });
  it('sums crew time and counts site accounts', () => {
    expect(parsed.minutes).toBe(56);
    expect(parsed.accounts).toBe(1);
  });
  it('flags an already-applied job with its date, and a blog as not a job page', () => {
    expect(parsed.links.find((l) => l.company === 'Stripe')).toMatchObject({
      kind: 'applied',
      appliedOn: '2026-10-14',
    });
    expect(parsed.links.find((l) => l.company === 'Blog post')).toMatchObject({ kind: 'invalid', site: 'medium.com' });
  });
});

describe('dedupe', () => {
  it('skips jobs already in Up next', () => {
    const p = parsePaste(SAMPLE_PASTE, { applied: [], queued: SAMPLE_QUEUE });
    expect(p.links.find((l) => l.company === 'Duolingo')?.kind).toBe('queued');
    expect(p.links.find((l) => l.company === 'Capital One')?.kind).toBe('queued');
  });
  it('skips repeats inside one paste and a repeated URL', () => {
    const url = 'https://boards.greenhouse.io/duolingo/jobs/1';
    const p = parsePaste(url + '\n' + url + '\nhttps://jobs.ashbyhq.com/duolingo/2', emptyCtx);
    expect(p.links.map((l) => l.kind)).toEqual(['new', 'duplicate', 'duplicate']);
  });
  it('title-cases an unknown company and marks its role unresolved', () => {
    const p = parsePaste('https://jobs.lever.co/acme-labs/abc', emptyCtx);
    expect(p.links[0]).toMatchObject({ company: 'Acme Labs', roleUnresolved: true, kind: 'new', estimateMin: 2 });
  });
});

describe('summarize and queue items', () => {
  it('recomputes totals after the user drops rows', () => {
    const p = parsePaste(SAMPLE_PASTE, emptyCtx);
    const kept = summarize(p.links.filter((l) => l.company !== 'Capital One'));
    expect(kept.toQueue).toHaveLength(3);
    expect(kept.minutes).toBe(6);
    expect(kept.accounts).toBe(0);
  });
  it('builds queued items from the kept links', () => {
    const p = parsePaste(SAMPLE_PASTE, emptyCtx);
    const items = toQueueItems(p.toQueue, 'Pasted', ['a', 'b', 'c', 'd']);
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(items[3]).toMatchObject({
      company: 'Capital One',
      stage: 'queued',
      siteNote: 'creates a site account',
      estimateMin: 50,
    });
  });
});
