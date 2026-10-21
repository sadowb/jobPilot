import { describe, expect, it } from 'vitest';
import { FACT_QUESTIONS } from '../src/renderer/src/features/onboarding/data';
import { activeQuestion, answer, answeredCount, emptyAnswers } from '../src/renderer/src/features/onboarding/facts';
import { dotState, nextPath, parseStep, stepPath } from '../src/renderer/src/features/onboarding/steps';

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
