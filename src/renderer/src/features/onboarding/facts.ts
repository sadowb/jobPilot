import { FACT_QUESTIONS } from './data';

export type FactAnswers = readonly (string | null)[];

export const emptyAnswers = (): FactAnswers => FACT_QUESTIONS.map(() => null);

/** Index of the question awaiting an answer, or null once all three are answered. */
export function activeQuestion(answers: FactAnswers): number | null {
  const i = answers.findIndex((a) => a === null);
  return i === -1 ? null : i;
}

export function answeredCount(answers: FactAnswers): number {
  return answers.filter((a) => a !== null).length;
}

/**
 * Records an answer. Only the active question or one already answered can change; an option that
 * the question does not offer is ignored, so stale UI events cannot corrupt the saved facts.
 */
export function answer(answers: FactAnswers, question: number, option: string): FactAnswers {
  const spec = FACT_QUESTIONS[question];
  if (!spec || !spec.options.includes(option)) return answers;
  const active = activeQuestion(answers);
  if (active !== null && question > active) return answers;
  return answers.map((a, i) => (i === question ? option : a));
}
