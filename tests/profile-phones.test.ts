import { describe, expect, it } from 'vitest';
import {
  asYouType,
  formatPhone,
  migratePhone,
  normalizePhone,
  parsePhone,
  phoneProblem,
  regionFromCountryName,
} from '../src/renderer/src/features/profile/phones';
import { effectiveSalaryCurrency, EMPTY_PROFILE, readProfile } from '../src/renderer/src/features/profile/personal';
import { CURRENCIES } from '../src/renderer/src/features/profile/markets';

describe('phone normalisation', () => {
  it('stores valid numbers as E.164, with or without a country code', () => {
    expect(normalizePhone('+212 612-345678')).toBe('+212612345678');
    expect(normalizePhone('0612345678', 'MA')).toBe('+212612345678');
    expect(normalizePhone('+1 (646) 555 0142')).toBe('+16465550142');
    expect(normalizePhone('+212612345678')).toBe('+212612345678');
  });

  it('keeps unparseable text verbatim instead of dropping it', () => {
    expect(normalizePhone('call me', 'MA')).toBe('call me');
    expect(normalizePhone('+44 123')).toBe('+44 123');
    expect(normalizePhone('  ')).toBe('');
  });

  it('formats internationally and reports the number type when known', () => {
    const info = parsePhone('+212612345678');
    expect(info).toMatchObject({
      valid: true,
      region: 'MA',
      dial: '+212',
      international: '+212 6 12 34 56 78',
      type: 'MOBILE',
    });
    expect(formatPhone('0612345678', 'MA')).toBe('+212 6 12 34 56 78');
    expect(parsePhone('+16465550142').type).toBeUndefined();
    expect(parsePhone('xyz')).toEqual({ valid: false, raw: 'xyz' });
  });

  it('formats as you type', () => {
    expect(asYouType('MA', '0612345678')).toBe('06 12 34 56 78');
  });
});

describe('phone validation', () => {
  it('accepts empty and valid numbers', () => {
    for (const v of ['', '  ', '+212612345678', '+1 646 555 0142']) expect(phoneProblem(v), v).toBeNull();
  });

  it('rejects letters, incomplete numbers and numbers without a country code', () => {
    for (const v of ['612345678abc', '+212 61', '612345678', '+999 123456', '+12345']) {
      expect(phoneProblem(v), v).toBe('Check this number');
    }
  });
});

describe('phone migration on read', () => {
  it('maps the profile country to a default region', () => {
    expect(regionFromCountryName('Morocco')).toBe('MA');
    expect(regionFromCountryName(' united states ')).toBe('US');
    expect(regionFromCountryName('Atlantis')).toBeUndefined();
    expect(regionFromCountryName('')).toBeUndefined();
  });

  it('normalises legacy free-text phones using the profile country', () => {
    const profile = readProfile(
      JSON.stringify({ country: 'Morocco', phone: '06 12-34 56 78', alternatePhone: '+1 (646) 555 0142' }),
    );
    expect(profile.phone).toBe('+212612345678');
    expect(profile.alternatePhone).toBe('+16465550142');
    expect(migratePhone('0612345678', 'MA')).toBe('+212612345678');
  });

  it('keeps a phone it cannot parse, and is idempotent', () => {
    const profile = readProfile(JSON.stringify({ country: 'Morocco', phone: '612345678abc', alternatePhone: '' }));
    expect(profile.phone).toBe('612345678abc');
    expect(readProfile(JSON.stringify(profile))).toEqual(profile);
    expect(readProfile(JSON.stringify({ phone: '0612345678' })).phone).toBe('0612345678');
  });
});

describe('career in the profile store', () => {
  const entry = { id: 'a', role: 'Builder', organisation: 'Independent', start: '2025-01', end: 'present' };

  it('round-trips valid entries', () => {
    const profile = readProfile(JSON.stringify({ career: [entry] }));
    expect(profile.career).toEqual([entry]);
    expect(readProfile(null).career).toEqual([]);
  });

  it('rejects malformed entries', () => {
    const bad = [
      [{ ...entry, role: '' }],
      [{ ...entry, start: '2025-13' }],
      [{ ...entry, end: '2024-12' }],
      [{ ...entry, end: 'now' }],
      [entry, entry],
      [{ ...entry, id: 5 }],
      'x',
    ];
    for (const career of bad) expect(() => readProfile(JSON.stringify({ career })), JSON.stringify(career)).toThrow();
  });
});

describe('salary currency', () => {
  it('defaults to the profile country and prefers an explicit choice', () => {
    expect(effectiveSalaryCurrency({ ...EMPTY_PROFILE, countryCode: 'MA' })).toBe('MAD');
    expect(effectiveSalaryCurrency({ ...EMPTY_PROFILE, countryCode: 'MA', salaryCurrency: 'EUR' })).toBe('EUR');
    expect(effectiveSalaryCurrency(EMPTY_PROFILE)).toBe('');
  });

  it('lists currencies alphabetically by name', () => {
    const names = CURRENCIES.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
