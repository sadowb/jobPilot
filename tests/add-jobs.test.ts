import { describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ html: '' }));
vi.mock('../src/main/modules/postings/ats/common', async (orig) => ({
  ...(await orig<typeof import('../src/main/modules/postings/ats/common')>()),
  request: async (url: string) => ({ url: new URL(url), text: page.html }),
}));
import { candidateUrls, reconcileRows } from '../src/renderer/src/features/dashboard/addjobs/rows';
import { fetchPosting, matchPostingUrl, NotAJobPageError } from '../src/main/modules/postings/ats';
import { canonicalUrl } from '../src/main/modules/postings/ats/common';

const GH = 'https://job-boards.greenhouse.io/acme/jobs/4076934007';
const ZW = String.fromCharCode(0x200b);
const WK = 'https://apply.workable.com/j/3A8C3159E7';

describe('add-jobs row state', () => {
  it('keeps a removed link removed across textarea edits, until it leaves the text', () => {
    const text = `${GH}\n${WK}`;
    const first = reconcileRows(text, [], new Set());
    const after = reconcileRows(`${text}\n`, first.rows.slice(1), new Set([GH]));
    expect(after.rows.map((r) => r.url)).toEqual([WK]);
    const gone = reconcileRows(WK, after.rows, after.dismissed);
    expect(gone.dismissed.size).toBe(0);
    expect(reconcileRows(text, gone.rows, gone.dismissed).rows).toHaveLength(2);
  });

  it('keeps an edited row (new url, same source) across textarea edits', () => {
    const [row] = reconcileRows(GH, [], new Set()).rows;
    const edited = { ...row!, url: WK };
    expect(reconcileRows(`${GH} `, [edited], new Set()).rows[0]).toBe(edited);
  });

  it('strips zero-width characters and trailing punctuation from pasted links', () => {
    expect(candidateUrls(`see ${GH}${ZW}. and ${GH}`)).toEqual([GH]);
  });
});

describe('URL cleaning and ATS anchoring', () => {
  it('canonicalUrl drops invisible and whitespace characters', () => {
    expect(canonicalUrl(`${GH}${ZW}`).href).toBe(GH);
  });

  const uuid = '123e4567-e89b-12d3-a456-426614174000';
  const good = [
    GH,
    `https://jobs.lever.co/acme/${uuid}`,
    `https://jobs.ashbyhq.com/acme/${uuid}`,
    `https://jobs.ashbyhq.com/acme/${uuid}/application`,
    WK,
    'https://jobs.smartrecruiters.com/Acme/743999000000001-engineer',
    'https://acme.bamboohr.com/careers/35',
  ];
  it.each(good)('accepts %s', (u) => expect(matchPostingUrl(new URL(u))).not.toBeNull());

  const junk = [
    `${GH}abc`,
    `https://jobs.lever.co/acme/${uuid}abc`,
    `https://jobs.ashbyhq.com/acme/${uuid}abc`,
    `https://jobs.ashbyhq.com/acme/${uuid}/applicationx`,
    `${WK}-x`,
    'https://jobs.smartrecruiters.com/Acme/743999000000001abc/x',
    'https://acme.bamboohr.com/careers/35abc',
  ];
  it.each(junk)('rejects trailing junk: %s', (u) => expect(matchPostingUrl(new URL(u))).toBeNull());
});

describe('custom page classification', () => {
  const read = (html: string) => {
    page.html = `<html><head><title>Role</title></head><body>${html}</body></html>`;
    return fetchPosting('https://careers.example.org/role');
  };
  const ld = '<script type="application/ld+json">{"@type":"JobPosting","title":"Engineer"}</script>';

  it('JobPosting JSON-LD is a verified posting', async () => {
    expect(await read(ld)).toMatchObject({ ats: 'custom', verified: true, title: 'Engineer' });
  });
  it.each([
    ['a CV upload form', '<form><input type="file" name="cv"></form>'],
    ['an email + name form', '<form><input name="full_name"><input type="email" name="email"></form>'],
    ['an ATS iframe', '<iframe src="https://boards.greenhouse.io/embed/job_app?for=acme"></iframe>'],
    ['an ATS script', '<script src="https://jobs.lever.co/widget.js"></script>'],
  ])('%s is accepted as unverified', async (_name, html) => {
    expect(await read(html)).toMatchObject({ ats: 'custom', verified: false });
  });
  it.each([
    ['a search-only page', '<form action="/search"><input type="search" name="q"></form>'],
    ['an article', '<article><h1>Job</h1><p>A job is a role.</p></article>'],
    [
      'a login form',
      '<form><input name="username"><input type="email" name="email"><input type="password" name="p"></form>',
    ],
    ['an email-only newsletter form', '<form><input type="email" name="email"></form>'],
    ['a non-ATS iframe', '<iframe src="https://www.youtube.com/embed/x"></iframe>'],
  ])('%s is rejected as not a job page', async (_name, html) => {
    await expect(read(html)).rejects.toBeInstanceOf(NotAJobPageError);
  });
});
