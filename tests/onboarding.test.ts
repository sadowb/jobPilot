import { describe, expect, it } from 'vitest';
import { FACT_QUESTIONS } from '../src/renderer/src/features/onboarding/data';
import { activeQuestion, answer, answeredCount, emptyAnswers } from '../src/renderer/src/features/onboarding/facts';
import { dotState, nextPath, parseStep, stepPath } from '../src/renderer/src/features/onboarding/steps';
import { EMPTY_PROFILE } from '../src/renderer/src/features/profile/personal';
import { ProfileRepository } from '../src/main/modules/profile/profile.repository';
import { ProfileDataSchema, ProfileSaveSchema } from '../src/shared/dto';

describe('onboarding steps', () => {
  it('parses only 1..5', () => {
    expect(parseStep('1')).toBe(1);
    expect(parseStep('5')).toBe(5);
    for (const bad of [undefined, '', '0', '6', '12', '1x', 'a', '-1', '1.5']) expect(parseStep(bad)).toBeNull();
  });

  it('continues to the next step and leaves to the dashboard after the last', () => {
    expect(nextPath(1)).toBe(stepPath(2));
    expect(nextPath(4)).toBe('/welcome/5');
    expect(nextPath(5)).toBe('/');
  });

  it('draws done, current and ahead dots', () => {
    expect([1, 2, 3, 4, 5].map((i) => dotState(i as 1, 3))).toEqual(['done', 'done', 'current', 'ahead', 'ahead']);
  });
});

describe('fact answers', () => {
  const [q1, q2, q3] = FACT_QUESTIONS;
  if (!q1 || !q2 || !q3) throw new Error('sample questions missing');

  it('starts with the first question active', () => {
    const a = emptyAnswers();
    expect(activeQuestion(a)).toBe(0);
    expect(answeredCount(a)).toBe(0);
  });

  it('advances the active question as answers arrive', () => {
    let a = answer(emptyAnswers(), 0, q1.options[0]!);
    expect(activeQuestion(a)).toBe(1);
    a = answer(a, 1, q2.options[1]!);
    a = answer(a, 2, q3.options[2]!);
    expect(activeQuestion(a)).toBeNull();
    expect(answeredCount(a)).toBe(3);
  });

  it('ignores answers to questions that are not active yet', () => {
    const a = emptyAnswers();
    expect(answer(a, 2, q3.options[0]!)).toBe(a);
  });

  it('ignores options the question does not offer', () => {
    const a = emptyAnswers();
    expect(answer(a, 0, 'not an option')).toBe(a);
    expect(answer(a, 9, 'x')).toBe(a);
  });

  it('lets an answered question be changed without losing later answers', () => {
    let a = answer(emptyAnswers(), 0, q1.options[0]!);
    a = answer(a, 1, q2.options[0]!);
    a = answer(a, 0, q1.options[1]!);
    expect(a).toEqual([q1.options[1], q2.options[0], null]);
  });
});

describe('onboarding completion persistence and migration (#135)', () => {
  it('defaults onboardingCompletedAt to null for fresh profiles in ProfileDataSchema', () => {
    const fresh = ProfileDataSchema.parse({ personal: null, markets: [], answers: null });
    expect(fresh.onboardingCompletedAt).toBeNull();
  });

  it('accepts integer timestamps and rejects invalid values in ProfileDataSchema', () => {
    const timestamp = Date.now();
    const completed = ProfileDataSchema.parse({
      personal: null,
      markets: [],
      answers: null,
      onboardingCompletedAt: timestamp,
    });
    expect(completed.onboardingCompletedAt).toBe(timestamp);

    expect(() =>
      ProfileDataSchema.parse({
        personal: null,
        markets: [],
        answers: null,
        onboardingCompletedAt: -1,
      }),
    ).toThrow();

    expect(() =>
      ProfileDataSchema.parse({
        personal: null,
        markets: [],
        answers: null,
        onboardingCompletedAt: 'done',
      }),
    ).toThrow();
  });

  it('validates onboardingCompletedAt saves via ProfileSaveSchema', () => {
    const timestamp = 1740000000000;
    const savePayload = ProfileSaveSchema.parse({
      section: 'onboardingCompletedAt',
      value: timestamp,
    });
    expect(savePayload).toEqual({ section: 'onboardingCompletedAt', value: timestamp });

    const nullPayload = ProfileSaveSchema.parse({
      section: 'onboardingCompletedAt',
      value: null,
    });
    expect(nullPayload).toEqual({ section: 'onboardingCompletedAt', value: null });
  });

  it('treats existing row with non-empty personal profile as completed in ProfileRepository', () => {
    type Db = ConstructorParameters<typeof ProfileRepository>[0];
    const emptyRepo = new ProfileRepository({
      select: () => ({ from: () => ({ get: () => undefined }) }),
    } as unknown as Db);
    expect(emptyRepo.read()).toEqual({
      personal: null,
      markets: [],
      answers: null,
      onboardingCompletedAt: null,
    });

    const uncompletedRepo = new ProfileRepository({
      select: () => ({
        from: () => ({
          get: () => ({ preferences: { personal: null, markets: [], answers: null } }),
        }),
      }),
    } as unknown as Db);
    expect(uncompletedRepo.read().onboardingCompletedAt).toBeNull();

    const existingRepo = new ProfileRepository({
      select: () => ({
        from: () => ({
          get: () => ({
            updatedAt: 1740000000000,
            preferences: {
              personal: { ...EMPTY_PROFILE, firstName: 'Sara', lastName: 'Benali' },
              markets: [],
              answers: null,
            },
          }),
        }),
      }),
    } as unknown as Db);
    expect(existingRepo.read().onboardingCompletedAt).toBe(1740000000000);

    // The #135 users: onboarding never saved `personal`, but their markets/answers prove they finished it.
    const marketsOnlyRepo = new ProfileRepository({
      select: () => ({
        from: () => ({
          get: () => ({
            updatedAt: 1740000000001,
            preferences: { personal: null, markets: [{ code: 'MA', workAuth: 'authorized' }], answers: null },
          }),
        }),
      }),
    } as unknown as Db);
    expect(marketsOnlyRepo.read().onboardingCompletedAt).toBe(1740000000001);

    // Quit midway through onboarding on the new version: answers are saved, the flag is an explicit null.
    const midOnboardingRepo = new ProfileRepository({
      select: () => ({
        from: () => ({
          get: () => ({
            updatedAt: 1740000000002,
            preferences: {
              personal: null,
              markets: [{ code: 'MA', workAuth: 'authorized' }],
              answers: null,
              onboardingCompletedAt: null,
            },
          }),
        }),
      }),
    } as unknown as Db);
    expect(midOnboardingRepo.read().onboardingCompletedAt).toBeNull();
  });
});
