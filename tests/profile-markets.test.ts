import { describe, expect, it } from 'vitest';
import {
  COUNTRIES,
  CURRENCIES,
  countryName,
  defaultCurrency,
  marketSummary,
  readMarkets,
  type Market,
} from '../src/renderer/src/features/profile/markets';
import { cvFileName, splitList } from '../src/renderer/src/features/profile/personal';

describe('readMarkets', () => {
  it('returns an empty list for empty storage', () => {
    expect(readMarkets(null)).toEqual([]);
    expect(readMarkets('')).toEqual([]);
    expect(readMarkets('[]')).toEqual([]);
  });

  it('round-trips valid countries, including the EU market and every optional field', () => {
    const markets: Market[] = [
      {
        code: 'US',
        workAuth: 'sponsorship',
        phone: '+1 646 555 0142',
        currency: 'USD',
        cvLanguage: 'English',
        photo: false,
      },
      { code: 'EU', workAuth: 'authorized', currency: 'EUR', cvLanguage: 'French', photo: true },
      { code: 'MA', workAuth: 'authorized' },
    ];
    expect(readMarkets(JSON.stringify(markets))).toEqual(markets);
  });

  it('drops unknown keys instead of persisting them', () => {
    expect(readMarkets(JSON.stringify([{ code: 'CA', workAuth: 'authorized', extra: 1 }]))).toEqual([
      { code: 'CA', workAuth: 'authorized' },
    ]);
  });

  it('rejects corrupt storage', () => {
    const bad = [
      '{',
      'null',
      '{}',
      '[null]',
      '[[]]',
      '[{"code":"US"}]',
      '[{"code":"US","workAuth":"maybe"}]',
      '[{"code":"usa","workAuth":"authorized"}]',
      '[{"code":"ZZ","workAuth":"authorized"}]',
      '[{"code":1,"workAuth":"authorized"}]',
      '[{"code":"US","workAuth":"authorized","currency":"usd"}]',
      '[{"code":"US","workAuth":"authorized","currency":5}]',
      '[{"code":"US","workAuth":"authorized","photo":"yes"}]',
      '[{"code":"US","workAuth":"authorized","phone":""}]',
      '[{"code":"US","workAuth":"authorized","cvLanguage":null}]',
    ];
    for (const raw of bad) expect(() => readMarkets(raw), raw).toThrow();
  });

  it('rejects duplicate countries', () => {
    const entry = { code: 'US', workAuth: 'authorized' };
    expect(() => readMarkets(JSON.stringify([entry, { ...entry, workAuth: 'sponsorship' }]))).toThrow(/duplicate/);
  });
});

describe('country helpers', () => {
  it('names known markets and rejects unassigned codes', () => {
    expect(countryName('US')).toBe('United States');
    expect(countryName('EU')).toBe('European Union');
    expect(countryName('ZZ')).toBeUndefined();
    expect(countryName('us')).toBeUndefined();
  });

  it('summarises what is sent for a market', () => {
    expect(marketSummary({ code: 'US', workAuth: 'authorized', cvLanguage: 'English', currency: 'USD' })).toBe(
      'English CV · salary in USD',
    );
    expect(
      marketSummary({ code: 'EU', workAuth: 'authorized', cvLanguage: 'French', photo: true, currency: 'EUR' }),
    ).toBe('French CV with photo · salary in EUR');
    expect(marketSummary({ code: 'CA', workAuth: 'authorized' })).toBe('');
  });
});

describe('cvFileName', () => {
  it('builds "First Last.pdf" from the profile name', () => {
    expect(cvFileName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace.pdf');
    expect(cvFileName({ firstName: ' Ada ', lastName: '' })).toBe('Ada.pdf');
  });

  it('falls back to Resume.pdf when the name is empty', () => {
    expect(cvFileName({ firstName: '', lastName: '' })).toBe('Resume.pdf');
    expect(cvFileName({ firstName: '  ', lastName: ' ' })).toBe('Resume.pdf');
  });

  it('removes characters that are illegal in file names', () => {
    expect(cvFileName({ firstName: 'A/b\\c', lastName: 'D:e*f?"g<h>i|j' })).toBe('Abc Defghij.pdf');
    expect(cvFileName({ firstName: 'Ada\u0000\n', lastName: 'Lovelace' })).toBe('Ada Lovelace.pdf');
    expect(cvFileName({ firstName: '..', lastName: '' })).toBe('Resume.pdf');
    expect(cvFileName({ firstName: '/\\:', lastName: '*?' })).toBe('Resume.pdf');
    expect(cvFileName({ firstName: 'CON', lastName: '' })).toBe('Resume.pdf');
    expect(cvFileName({ firstName: 'Lpt1', lastName: '' })).toBe('Resume.pdf');
    expect(cvFileName({ firstName: 'Connor', lastName: '' })).toBe('Connor.pdf');
  });
  it('never splits an emoji when capping long names', () => {
    // 98 + space + emoji = exactly 100 code points: the emoji survives whole.
    expect(cvFileName({ firstName: 'a'.repeat(98), lastName: '😀' })).toBe(`${'a'.repeat(98)} 😀.pdf`);
    // 99 + space + emoji = 101 code points: the emoji is dropped whole, then the trailing space.
    expect(cvFileName({ firstName: 'a'.repeat(99), lastName: '😀' })).toBe(`${'a'.repeat(99)}.pdf`);
    // Old code cut UTF-16 units: 99 'a' + emoji → lone high surrogate.
    expect(cvFileName({ firstName: 'a'.repeat(99) + '😀', lastName: '' })).toBe(`${'a'.repeat(99)}😀.pdf`);
  });

  it('keeps the name within a sane length', () => {
    expect(cvFileName({ firstName: 'a'.repeat(500), lastName: '' }).length).toBeLessThanOrEqual(104);
  });
});

describe('defaultCurrency', () => {
  it('maps the EU and every addable country to a currency the editor offers', () => {
    expect(defaultCurrency('US')).toBe('USD');
    expect(defaultCurrency('GB')).toBe('GBP');
    expect(defaultCurrency('MA')).toBe('MAD');
    expect(defaultCurrency('EU')).toBe('EUR');
    expect(defaultCurrency('DE')).toBe('EUR');
    for (const c of [{ code: 'EU' }, ...COUNTRIES]) {
      const currency = defaultCurrency(c.code);
      expect(currency, c.code).toMatch(/^[A-Z]{3}$/);
      expect(CURRENCIES.some((x) => x.code === currency)).toBe(true);
    }
  });
});

describe('splitList', () => {
  it('trims, drops blanks and de-duplicates', () => {
    expect(splitList(' AI engineer, , solutions engineer\nai engineer ')).toEqual([
      'AI engineer',
      'solutions engineer',
    ]);
  });
});
