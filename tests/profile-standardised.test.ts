import { describe, expect, it } from 'vitest';
import { countryOptions, matchCountry } from '../src/renderer/src/features/profile/countries';
import {
  languagesError,
  matchLanguage,
  parseLanguages,
  parseLanguageText,
} from '../src/renderer/src/features/profile/languages';
import {
  amountFromInput,
  formatSalary,
  groupDigits,
  parseSalaryText,
} from '../src/renderer/src/features/profile/salary';
import { readProfile } from '../src/renderer/src/features/profile/personal';

const profileOf = (fields: Record<string, unknown>) => readProfile(JSON.stringify(fields));

describe('country matching', () => {
  it('lists ISO countries by name, without the EU', () => {
    const options = countryOptions();
    expect(options.length).toBeGreaterThan(200);
    expect(options.find((o) => o.code === 'MA')?.name).toBe('Morocco');
    expect(options.some((o) => o.code === 'EU')).toBe(false);
    const names = options.map((o) => o.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('matches names case- and accent-insensitively, plus aliases and codes', () => {
    expect(matchCountry('morocco')).toBe('MA');
    expect(matchCountry('  MOROCCO ')).toBe('MA');
    expect(matchCountry('USA')).toBe('US');
    expect(matchCountry('United States of America')).toBe('US');
    expect(matchCountry('UK')).toBe('GB');
    expect(matchCountry('Holland')).toBe('NL');
    expect(matchCountry('fr')).toBe('FR');
  });

  it('returns undefined when nothing matches', () => {
    expect(matchCountry('Atlantis')).toBeUndefined();
    expect(matchCountry('')).toBeUndefined();
    expect(matchCountry('EU')).toBeUndefined();
    expect(matchCountry('ZZ')).toBeUndefined();
  });
});

describe('country migration in readProfile', () => {
  it('turns matching free text into a code and drops the text', () => {
    const p = profileOf({ country: 'morocco' });
    expect(p.countryCode).toBe('MA');
    expect(p.country).toBe('');
  });
  it('keeps unmatched text so the editor can ask', () => {
    const p = profileOf({ country: 'Atlantis' });
    expect(p.countryCode).toBe('');
    expect(p.country).toBe('Atlantis');
  });
  it('keeps a valid code and rejects invalid ones', () => {
    expect(profileOf({ countryCode: 'US' }).countryCode).toBe('US');
    expect(() => profileOf({ countryCode: 'EU' })).toThrow();
    expect(() => profileOf({ countryCode: 'XX' })).toThrow();
  });
  it('uses the code as the default region when migrating phones', () => {
    expect(profileOf({ country: 'Morocco', phone: '0612345678' }).phone).toBe('+212612345678');
  });
});

describe('salary input and formatting', () => {
  it('groups digits and ignores everything else', () => {
    expect(groupDigits('120000')).toBe('120,000');
    expect(groupDigits('1,2a0,000')).toBe('120,000');
    expect(groupDigits('007')).toBe('7');
    expect(groupDigits('')).toBe('');
  });
  it('turns input into a number or null, capped at nine digits', () => {
    expect(amountFromInput('120,000')).toBe(120000);
    expect(amountFromInput('abc')).toBeNull();
    expect(amountFromInput('1234567890')).toBe(123456789);
  });
  it('formats once, with the currency inside the amount', () => {
    expect(formatSalary(120000, 'year', 'USD')).toBe('$120,000 per year');
    expect(formatSalary(5000, 'month', 'EUR')).toBe('€5,000 per month');
    expect(formatSalary(60000, 'year')).toBe('60,000 per year');
    expect(formatSalary(1, 'year', 'NOPE!')).toContain('per year');
  });
});

describe('salary migration', () => {
  it('parses unambiguous text', () => {
    expect(parseSalaryText('60,000')).toEqual({ amount: 60000, period: 'year' });
    expect(parseSalaryText('USD 60k per year')).toEqual({ amount: 60000, period: 'year', currency: 'USD' });
    expect(parseSalaryText('5 000 / month')).toMatchObject({ amount: 5000, period: 'month' });
  });
  it('refuses ranges, several numbers and text without a number', () => {
    expect(parseSalaryText('50k - 60k')).toBeNull();
    expect(parseSalaryText('Negotiable')).toBeNull();
    expect(parseSalaryText('')).toBeNull();
    expect(parseSalaryText('0')).toBeNull();
  });
  it('migrates through readProfile and keeps ambiguous text', () => {
    const ok = profileOf({ salary: 'USD 60k per year' });
    expect(ok).toMatchObject({ salaryAmount: 60000, salaryPeriod: 'year', salaryCurrency: 'USD', salary: '' });
    const bad = profileOf({ salary: 'Negotiable' });
    expect(bad.salaryAmount).toBeNull();
    expect(bad.salary).toBe('Negotiable');
  });
  it('validates stored values', () => {
    expect(profileOf({ salaryAmount: 5, salaryPeriod: 'month' })).toMatchObject({
      salaryAmount: 5,
      salaryPeriod: 'month',
    });
    expect(() => profileOf({ salaryAmount: -1 })).toThrow();
    expect(() => profileOf({ salaryAmount: 1.5 })).toThrow();
    expect(() => profileOf({ salaryPeriod: 'week' })).toThrow();
  });
});

describe('languages', () => {
  it('matches names, aliases and codes', () => {
    expect(matchLanguage('French')).toBe('fr');
    expect(matchLanguage('arabic')).toBe('ar');
    expect(matchLanguage('Darija')).toBe('ar');
    expect(matchLanguage('Klingon')).toBeUndefined();
  });
  it('parses the old text forms', () => {
    const entries = parseLanguageText('French (Professional), Arabic - Native; English: Fluent');
    expect(entries.map(({ language, level }) => ({ language, level }))).toEqual([
      { language: 'fr', level: 'Professional' },
      { language: 'ar', level: 'Native' },
      { language: 'en', level: 'Fluent' },
    ]);
    expect(new Set(entries.map((e) => e.id)).size).toBe(3);
  });
  it('accepts a language without a level', () => {
    expect(parseLanguageText('Spanish')[0]).toMatchObject({ language: 'es', level: '' });
  });
  it('flags what it cannot parse instead of dropping it', () => {
    const [a, b] = parseLanguageText('Klingon (Fluent), French (Wizard)');
    expect(a).toMatchObject({ language: '', raw: 'Klingon (Fluent)' });
    expect(b).toMatchObject({ language: '', raw: 'French (Wizard)' });
    expect(languagesError([a!, b!])).toMatch(/Choose a language/);
  });
  it('rejects duplicates', () => {
    const [a, b] = parseLanguageText('French, French (Fluent)');
    expect(languagesError([a!, b!])).toMatch(/once/);
    expect(languagesError([a!])).toBeNull();
  });
  it('migrates string languages through readProfile and validates arrays', () => {
    expect(profileOf({ languages: 'French (Professional)' }).languages).toMatchObject([
      { language: 'fr', level: 'Professional' },
    ]);
    expect(profileOf({ languages: [{ id: 'a', language: 'fr', level: 'Native' }] }).languages).toHaveLength(1);
    expect(() => profileOf({ languages: [{ id: 'a', language: 'fr', level: 'Godlike' }] })).toThrow();
    expect(() => parseLanguages([{ id: 'a', language: '', level: '' }])).toThrow();
    expect(() =>
      parseLanguages([
        { id: 'a', language: 'fr', level: '' },
        { id: 'a', language: 'de', level: '' },
      ]),
    ).toThrow();
  });
});
