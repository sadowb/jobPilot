import { describe, expect, it } from 'vitest';
import {
  answerFor,
  answerMarkets,
  answeredCount,
  answerSummary,
  AUTHORIZATION_QUESTION,
  authorizationAnswer,
  migrateLegacyAnswers,
  parseAnswersV2,
  readAnswersV2,
  resolveSalary,
  salaryAnswer,
  startAnswer,
  STARTER_ANSWERS,
  type Answer,
} from '../src/renderer/src/features/profile/answers';
import { EMPTY_PROFILE } from '../src/renderer/src/features/profile/personal';

const answer = (over: Partial<Answer> = {}): Answer => ({
  id: 'q',
  question: 'When can you start?',
  default: 'Immediately',
  overrides: {},
  ...over,
});

describe('answerFor', () => {
  it('prefers the override, then the default, then empty', () => {
    const a = answer({ overrides: { US: 'Two weeks' } });
    expect(answerFor(a, 'US')).toBe('Two weeks');
    expect(answerFor(a, 'MA')).toBe('Immediately');
    expect(answerFor(a)).toBe('Immediately');
    expect(answerFor(answer({ default: '  ' }), 'US')).toBe('');
  });

  it('uses an override even when the default is empty, and only for that market', () => {
    const a = answer({ default: '', overrides: { FR: 'Disponible de suite' } });
    expect(answerFor(a, 'FR')).toBe('Disponible de suite');
    expect(answerFor(a, 'MA')).toBe('');
  });

  it('treats unknown markets and blank overrides as "use the default"', () => {
    const a = answer({ overrides: { US: '   ' } });
    expect(answerFor(a, 'ZZ')).toBe('Immediately');
    expect(answerFor(a, 'US')).toBe('Immediately');
  });

  it('works for the home country like any other market', () => {
    const markets = answerMarkets({ countryCode: 'MA' }, [{ code: 'US', workAuth: 'sponsorship' }]);
    expect(markets.map((m) => m.code)).toEqual(['MA', 'US']);
    expect(markets[0]).toMatchObject({ home: true, workAuth: 'authorized' });
    expect(answerFor(answer({ overrides: { MA: 'Tout de suite' } }), markets[0]!.code)).toBe('Tout de suite');
  });
});

describe('answerMarkets', () => {
  it('lists no home row without a country, and does not duplicate a stored home market', () => {
    expect(answerMarkets({ countryCode: '' }, [{ code: 'US', workAuth: 'authorized' }]).map((m) => m.code)).toEqual([
      'US',
    ]);
    const stored = answerMarkets({ countryCode: 'MA' }, [
      { code: 'US', workAuth: 'authorized' },
      { code: 'MA', workAuth: 'sponsorship' },
    ]);
    expect(stored.map((m) => m.code)).toEqual(['MA', 'US']);
    expect(stored[0]).toMatchObject({ home: true, workAuth: 'sponsorship' });
  });
});

describe('answersV2 reader', () => {
  it('returns the starter questions for empty storage', () => {
    expect(readAnswersV2(null).map((a) => a.id)).toEqual(STARTER_ANSWERS.map((a) => a.id));
    expect(readAnswersV2(null).every((a) => a.default === '')).toBe(true);
  });

  it('round-trips valid answers', () => {
    const list = [answer({ overrides: { US: 'Two weeks', EU: 'One month' } })];
    expect(readAnswersV2(JSON.stringify(list))).toEqual(list);
  });

  it('rejects corrupt data', () => {
    const bad = [
      '{',
      'null',
      '{}',
      '[null]',
      '[{"id":"a","question":"q","default":1,"overrides":{}}]',
      '[{"id":"a","question":"q","default":"","overrides":[]}]',
      '[{"id":"a","question":"q","default":"","overrides":{"ZZ":"x"}}]',
      '[{"id":"a","question":"q","default":"","overrides":{"US":""}}]',
      '[{"id":"a","question":"q","default":"","overrides":{"US":5}}]',
      JSON.stringify([answer(), answer()]),
    ];
    for (const raw of bad) expect(() => readAnswersV2(raw), raw).toThrow();
    expect(() => parseAnswersV2('nope')).toThrow();
  });

  it('migrates v1 answers into defaults without losing text', () => {
    const legacy = JSON.stringify([
      { id: 'start', question: 'When can you start?', answer: 'Immediately' },
      { id: 'authorization', question: 'Where are you authorized to work?', answer: '' },
      { id: 'sponsorship', question: 'Will you need visa sponsorship?', answer: 'Yes, in the US' },
      { id: 'custom', question: 'Notice?', answer: '' },
    ]);
    const migrated = readAnswersV2(null, legacy);
    expect(migrated).toEqual([
      { id: 'start', question: 'When can you start?', default: 'Immediately', overrides: {} },
      { id: 'sponsorship', question: 'Will you need visa sponsorship?', default: 'Yes, in the US', overrides: {} },
      { id: 'custom', question: 'Notice?', default: '', overrides: {} },
    ]);
    expect(migrateLegacyAnswers([])).toEqual([]);
  });

  it('prefers v2 over legacy and fails on a corrupt legacy value', () => {
    const v2 = JSON.stringify([answer({ id: 'only' })]);
    expect(readAnswersV2(v2, '{').map((a) => a.id)).toEqual(['only']);
    expect(() => readAnswersV2(null, '{')).toThrow();
  });

  it('counts questions answered at least by default', () => {
    expect(answeredCount([answer(), answer({ id: 'b', default: '' }), answer({ id: 'c', default: ' ' })])).toBe(1);
    expect(answeredCount([answer({ default: '', overrides: { US: 'x' } })])).toBe(0);
  });
});

describe('derived answers', () => {
  it('maps work authorisation to the wording used on forms', () => {
    expect(authorizationAnswer('authorized')).toBe('Yes');
    expect(authorizationAnswer('sponsorship')).toBe('Need visa sponsorship');
  });

  it('uses the profile salary only for the profile currency', () => {
    const profile = { ...EMPTY_PROFILE, salaryAmount: 120000, countryCode: 'MA' };
    // Home market (MAD): the profile figure applies.
    expect(salaryAnswer(profile, {})).toMatch(/^MAD\s?120,000 per year$/);
    expect(salaryAnswer(profile)).toMatch(/^MAD\s?120,000 per year$/);
    expect(salaryAnswer({ ...profile, salaryCurrency: 'EUR' })).toBe('€120,000 per year');
    expect(salaryAnswer({ ...profile, salaryPeriod: 'month' })).toMatch(/per month$/);
  });

  it('never reuses an amount in another currency', () => {
    const profile = { ...EMPTY_PROFILE, salaryAmount: 120000, countryCode: 'MA' };
    expect(resolveSalary(profile, { currency: 'USD' })).toEqual({ status: 'missing', currency: 'USD' });
    expect(resolveSalary(profile, { currency: 'EUR' })).toEqual({ status: 'missing', currency: 'EUR' });
    expect(salaryAnswer(profile, { currency: 'USD' })).toBe('');
    // Same currency as the profile: reused.
    expect(resolveSalary(profile, { currency: 'MAD' }).status).toBe('set');
  });

  it("prefers the market's own salary, in the market currency", () => {
    const profile = { ...EMPTY_PROFILE, salaryAmount: 120000, countryCode: 'MA' };
    const us = { currency: 'USD', salary: { amount: 90000, period: 'year' as const } };
    expect(resolveSalary(profile, us)).toEqual({ status: 'set', source: 'market', text: '$90,000 per year' });
    // A market salary works without any profile salary, and keeps its own period.
    const none = { ...EMPTY_PROFILE, countryCode: 'MA' };
    expect(salaryAnswer(none, { currency: 'EUR', salary: { amount: 5000, period: 'month' } })).toBe('€5,000 per month');
  });

  it('is missing when nothing is set', () => {
    expect(resolveSalary({ ...EMPTY_PROFILE, countryCode: 'MA' }, { currency: 'USD' })).toEqual({
      status: 'missing',
      currency: 'USD',
    });
    expect(resolveSalary(EMPTY_PROFILE)).toEqual({ status: 'missing', currency: '' });
  });

  it('derives "When can you start?" from Notice', () => {
    expect(startAnswer({ notice: null })).toBe('');
    expect(startAnswer({ notice: { kind: 'period', days: 0 } })).toBe('Immediately');
    expect(startAnswer({ notice: { kind: 'period', days: 14 } })).toBe("2 weeks' notice");
    expect(startAnswer({ notice: { kind: 'date', iso: '2026-12-01' } })).toBe('From 1 Dec 2026');
  });
});

describe('answerSummary', () => {
  const profile = { ...EMPTY_PROFILE, countryCode: 'MA' };
  const market = { code: 'US', name: 'United States', home: false, workAuth: 'authorized' as const, currency: 'USD' };
  const answers = [answer(), answer({ id: 'b', default: '' })];
  it('counts the three auto questions so the footer matches the tab badge', () => {
    expect(answerSummary(answers, [], EMPTY_PROFILE)).toEqual({ answered: 1, total: 4 });
    expect(answerSummary(answers, [market], profile)).toEqual({ answered: 2, total: 5 });
    expect(answerSummary(answers, [market], { ...profile, notice: { kind: 'period', days: 0 } })).toEqual({
      answered: 3,
      total: 5,
    });
  });
  it('does not count salary when every country lacks a figure in its own currency', () => {
    const rich = { ...profile, salaryAmount: 1 };
    expect(answerSummary([], [market], rich).answered).toBe(1);
    expect(answerSummary([], [{ ...market, salary: { amount: 1, period: 'year' } }], profile).answered).toBe(2);
  });
});

it('uses one authorization question for every country', () => {
  expect(AUTHORIZATION_QUESTION).toBe('Are you authorized to work here?');
});
