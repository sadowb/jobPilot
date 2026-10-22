import { describe, expect, it } from 'vitest';
import {
  isIsoDate,
  noticeAnswer,
  noticeLabel,
  parseNotice,
  parseNoticeText,
} from '../src/renderer/src/features/profile/notice';
import { readProfile, EMPTY_PROFILE } from '../src/renderer/src/features/profile/personal';
import { parseMarkets } from '../src/renderer/src/features/profile/markets';
import { planStartMigration } from '../src/renderer/src/features/profile/startMigration';
import type { Answer } from '../src/renderer/src/features/profile/answers';

const startAnswer = (text: string, over: Partial<Answer> = {}): Answer => ({
  id: 'start',
  question: 'When can you start?',
  default: text,
  overrides: {},
  ...over,
});

describe('notice values', () => {
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-12-01')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-1-1')).toBe(false);
  });

  it('reads the stored shapes strictly', () => {
    expect(parseNotice(undefined)).toBeNull();
    expect(parseNotice(null)).toBeNull();
    expect(parseNotice({ kind: 'period', days: 14 })).toEqual({ kind: 'period', days: 14 });
    expect(parseNotice({ kind: 'date', iso: '2026-12-01' })).toEqual({ kind: 'date', iso: '2026-12-01' });
    for (const bad of [
      'x',
      [],
      { kind: 'period', days: -1 },
      { kind: 'period', days: 1.5 },
      { kind: 'period' },
      { kind: 'date', iso: '2026-13-01' },
      { kind: 'other' },
    ])
      expect(() => parseNotice(bad), JSON.stringify(bad)).toThrow();
  });

  it('has a human label and an answer for each choice', () => {
    expect(noticeLabel({ kind: 'period', days: 0 })).toBe('Immediately');
    expect(noticeLabel({ kind: 'period', days: 30 })).toBe('1 month');
    expect(noticeLabel({ kind: 'period', days: 45 })).toBe('45 days');
    expect(noticeLabel({ kind: 'date', iso: '2026-12-01' })).toBe('From 1 Dec 2026');
    expect(noticeAnswer({ kind: 'period', days: 7 })).toBe("1 week's notice");
    expect(noticeAnswer({ kind: 'period', days: 14 })).toBe("2 weeks' notice");
    expect(noticeAnswer({ kind: 'period', days: 60 })).toBe("2 months' notice");
    expect(noticeAnswer({ kind: 'date', iso: '2026-12-01' })).toBe('From 1 Dec 2026');
  });

  it('parses unambiguous text and refuses the rest', () => {
    expect(parseNoticeText('Immediately')).toEqual({ kind: 'period', days: 0 });
    expect(parseNoticeText('2 weeks')).toEqual({ kind: 'period', days: 14 });
    expect(parseNoticeText("2 weeks' notice")).toEqual({ kind: 'period', days: 14 });
    expect(parseNoticeText('1 month')).toEqual({ kind: 'period', days: 30 });
    expect(parseNoticeText('2026-12-01')).toEqual({ kind: 'date', iso: '2026-12-01' });
    expect(parseNoticeText('after my exams')).toBeNull();
    expect(parseNoticeText('5 weeks')).toBeNull();
    expect(parseNoticeText('')).toBeNull();
  });
});

describe('notice migration in readProfile', () => {
  it('turns an old ISO start date into a date notice', () => {
    const p = readProfile(JSON.stringify({ startDate: '2026-12-01' }));
    expect(p.notice).toEqual({ kind: 'date', iso: '2026-12-01' });
    expect(p.startDate).toBe('');
  });
  it('keeps any other old text raw so it can be flagged', () => {
    const p = readProfile(JSON.stringify({ startDate: 'after graduation' }));
    expect(p.notice).toBeNull();
    expect(p.startDate).toBe('after graduation');
  });
  it('prefers a stored notice and rejects a malformed one', () => {
    const p = readProfile(JSON.stringify({ notice: { kind: 'period', days: 7 }, startDate: '2026-12-01' }));
    expect(p.notice).toEqual({ kind: 'period', days: 7 });
    expect(() => readProfile(JSON.stringify({ notice: { kind: 'period', days: 'x' } }))).toThrow();
  });
});

describe('start answer migration', () => {
  const profile = { ...EMPTY_PROFILE };

  it('does nothing without a start answer', () => {
    expect(planStartMigration(profile, [startAnswer('', { id: 'other', question: 'Other?' })])).toEqual({});
  });
  it('removes an empty one', () => {
    expect(planStartMigration(profile, [startAnswer('')])).toEqual({ answers: [] });
  });
  it('moves parseable text into Notice and removes the answer', () => {
    const plan = planStartMigration(profile, [startAnswer('2 weeks')]);
    expect(plan.profile?.notice).toEqual({ kind: 'period', days: 14 });
    expect(plan.answers).toEqual([]);
  });
  it('keeps unparseable text as the flagged legacy value', () => {
    const plan = planStartMigration(profile, [startAnswer('after my exams')]);
    expect(plan.profile?.notice).toBeNull();
    expect(plan.profile?.startDate).toBe('after my exams');
    expect(plan.answers).toEqual([]);
  });
  it('never loses text when Notice is already set', () => {
    const set = { ...profile, notice: { kind: 'period', days: 0 } as const };
    const plan = planStartMigration(set, [startAnswer('Flexible, ask me')]);
    expect(plan.profile).toBeUndefined();
    expect(plan.answers).toEqual([expect.objectContaining({ id: 'start-note', default: 'Flexible, ask me' })]);
    // Running it again finds no start question: the migration is idempotent.
    expect(planStartMigration(set, plan.answers!)).toEqual({});
  });
});

describe('market salary', () => {
  it('is optional, so existing markets migrate unchanged', () => {
    expect(parseMarkets([{ code: 'US', workAuth: 'authorized' }])).toEqual([{ code: 'US', workAuth: 'authorized' }]);
  });
  it('round-trips a valid salary and rejects malformed ones', () => {
    const salary = { amount: 90000, period: 'year' };
    expect(parseMarkets([{ code: 'US', workAuth: 'authorized', salary }])[0]?.salary).toEqual(salary);
    for (const bad of [
      { amount: -1, period: 'year' },
      { amount: 1.5, period: 'year' },
      { amount: 1, period: 'week' },
      5,
    ])
      expect(() => parseMarkets([{ code: 'US', workAuth: 'authorized', salary: bad }])).toThrow();
  });
});
