import { describe, expect, it, vi } from 'vitest';
import { candidateUrls, reconcileRows } from '../src/renderer/src/features/dashboard/addjobs/rows';
import { matchPostingUrl } from '../src/main/modules/postings/ats';
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

describe('non-job pages', () => {
  it('are rejected when there is no JobPosting JSON-LD', async () => {
    vi.resetModules();
    vi.doMock('../src/main/modules/postings/ats/common', async (orig) => ({
      ...(await orig<typeof import('../src/main/modules/postings/ats/common')>()),
      request: async (url: string) => ({
        url: new URL(url),
        text: '<html><title>Job</title><form><input name="q"></form></html>',
      }),
    }));
    const { fetchPosting, NotAJobPageError } = await import('../src/main/modules/postings/ats');
    await expect(fetchPosting('https://en.example.org/wiki/Job')).rejects.toBeInstanceOf(NotAJobPageError);
    vi.doUnmock('../src/main/modules/postings/ats/common');
  });
});
