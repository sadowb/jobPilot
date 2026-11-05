import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFormSchema } from '../src/main/modules/postings/ats/schema';

const fixture = (name: string): unknown => JSON.parse(readFileSync(`tests/fixtures/${name}.json`, 'utf8'));
const urls: string[] = [];
let handler: (url: string) => unknown;

vi.mock('../src/main/modules/postings/ats/common', async (orig) => ({
  ...(await orig<typeof import('../src/main/modules/postings/ats/common')>()),
  jsonValue: async (url: string, schema: { parse(value: unknown): unknown }) => {
    urls.push(url);
    return schema.parse(handler(url));
  },
}));

const posting = 'https://boards.greenhouse.io/perpay/jobs/5003430007';
const empty = { items: [], meta: { total_count: 0, per_page: 100 } };

beforeEach(() => {
  urls.length = 0;
  handler = (url) =>
    url.includes('/education/degrees')
      ? fixture('greenhouse-education-degrees')
      : url.includes('/education/disciplines')
        ? fixture('greenhouse-education-disciplines')
        : url.includes('/education/schools')
          ? url.includes('term=Drexel%20University')
            ? fixture('greenhouse-education-schools-drexel')
            : empty
          : fixture('greenhouse-perpay-5003430007');
});

describe('Greenhouse education lookups (#257)', () => {
  it('fetches degrees, disciplines and a school search only when the job has an education block', async () => {
    const schema = await fetchFormSchema(posting, undefined, undefined, { school: 'Drexel University' });
    const by = (role: string) => schema!.fields.find((f) => f.role === role)!;
    expect(by('school').options).toEqual(['Drexel University']);
    expect(by('degree').options).toContain("Bachelor's Degree");
    expect(by('discipline').options).toContain('Computer Science');
    expect(urls.filter((u) => u.includes('/education/'))).toHaveLength(3);

    urls.length = 0;
    const figmaLike = handler;
    handler = (url) => (url.includes('/jobs/') ? fixture('greenhouse-figma-5426468004') : figmaLike(url));
    const noEducation = await fetchFormSchema(
      'https://boards.greenhouse.io/figma/jobs/5426468004',
      undefined,
      undefined,
      {
        school: 'Drexel University',
      },
    );
    expect(noEducation!.fields.some((f) => f.role === 'school')).toBe(false);
    expect(urls.some((u) => u.includes('/education/'))).toBe(false);
  });

  it('retries a school search with the longest word, then the first letters', async () => {
    await fetchFormSchema(posting, undefined, undefined, { school: 'Al Akhawayn University' });
    const terms = urls.filter((u) => u.includes('/schools')).map((u) => decodeURIComponent(u.split('term=')[1]!));
    expect(terms).toEqual(['Al Akhawayn University', 'Akhawayn', 'Al A']);
  });

  it('keeps the plan when a lookup fails: the field simply has no options', async () => {
    const base = handler;
    handler = (url) => {
      if (url.includes('/education/')) throw new Error('HTTP 500 for boards-api.greenhouse.io');
      return base(url);
    };
    const schema = await fetchFormSchema(posting, undefined, undefined, { school: 'Drexel University' });
    expect(schema!.fields.find((f) => f.role === 'degree')!.options).toEqual([]);
    expect(schema!.fields.find((f) => f.name === 'first_name')).toBeDefined();
  });

  it('does not search schools without a school on file', async () => {
    await fetchFormSchema(posting);
    expect(urls.some((u) => u.includes('/schools'))).toBe(false);
  });
});
