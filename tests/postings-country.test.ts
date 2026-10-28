import { describe, expect, it } from 'vitest';
import { toCountryCode } from '../src/main/modules/postings/ats/common';
import { IsoCountryCodeSchema, PostingFormSchema } from '../src/shared/dto/postings.dto';

describe('ISO 3166-1 alpha-2 country schema (#132)', () => {
  it('accepts valid 2-letter uppercase ISO country codes', () => {
    for (const code of ['US', 'GB', 'DE', 'FR', 'CA', 'JP', 'AU', 'MA']) {
      expect(IsoCountryCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('rejects invalid or unassigned country codes', () => {
    for (const invalid of ['USA', 'us', 'ZZ', 'AA', 'XX', '12', '', 'United Kingdom']) {
      expect(IsoCountryCodeSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('allows country to be optional or null on PostingFormSchema', () => {
    const base = {
      company: 'Acme',
      title: 'Engineer',
      location: 'London',
      salary: null,
      description: null,
      canonical_url: 'https://example.com/jobs/1',
      ats: 'workable' as const,
      ats_tenant: 'acme',
      ats_job_id: '123',
      questions: [],
    };

    expect(PostingFormSchema.safeParse(base).success).toBe(true);
    expect(PostingFormSchema.safeParse({ ...base, country: 'GB' }).success).toBe(true);
    expect(PostingFormSchema.safeParse({ ...base, country: null }).success).toBe(true);
    expect(PostingFormSchema.safeParse({ ...base, country: 'invalid' }).success).toBe(false);
  });
});

describe('toCountryCode helper (#132)', () => {
  it('converts 2-letter codes to uppercase ISO alpha-2', () => {
    expect(toCountryCode('gb')).toBe('GB');
    expect(toCountryCode('GB')).toBe('GB');
    expect(toCountryCode('us')).toBe('US');
    expect(toCountryCode('de')).toBe('DE');
  });

  it('converts structured country names to ISO alpha-2 codes', () => {
    expect(toCountryCode('United Kingdom')).toBe('GB');
    expect(toCountryCode('United States')).toBe('US');
    expect(toCountryCode('Germany')).toBe('DE');
    expect(toCountryCode('France')).toBe('FR');
  });

  it('returns null for non-country strings, empty, or unassigned codes', () => {
    expect(toCountryCode(null)).toBeNull();
    expect(toCountryCode(undefined)).toBeNull();
    expect(toCountryCode('')).toBeNull();
    expect(toCountryCode('   ')).toBeNull();
    expect(toCountryCode('ZZ')).toBeNull();
    expect(toCountryCode('Remote')).toBeNull();
  });

  it('formats preview row metadata with country when present', () => {
    const formatSubtitle = (posting: {
      ats: string;
      location: string | null;
      country?: string | null;
      salary: string | null;
      questions: unknown[];
    }) =>
      [
        posting.ats,
        posting.location,
        posting.country,
        posting.salary,
        posting.questions.length ? `${posting.questions.length} questions` : 'No questions found',
      ]
        .filter(Boolean)
        .join(' · ');

    const withCountry = formatSubtitle({
      ats: 'Workable',
      location: 'London',
      country: 'GB',
      salary: null,
      questions: [{}],
    });
    expect(withCountry).toBe('Workable · London · GB · 1 questions');

    const withoutCountry = formatSubtitle({
      ats: 'Greenhouse',
      location: 'Hybrid',
      country: undefined,
      salary: null,
      questions: [],
    });
    expect(withoutCountry).toBe('Greenhouse · Hybrid · No questions found');
  });
});
