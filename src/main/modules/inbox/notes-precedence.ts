export interface OwnerAnswer {
  field_key: string;
  question: string;
  answer: string;
}

const MAX_ANSWERS = 30;

/** The owner's own saved answers, as the run prompt lists them (they outrank every note). */
export const ownerAnswersForPrompt = (
  rows: ReadonlyArray<{ fieldKey: string; questionText: string; answer: string | null; source: string | null }>,
): OwnerAnswer[] =>
  rows
    .filter((r) => r.source === 'owner' && r.answer !== null && r.answer.trim() !== '')
    .slice(0, MAX_ANSWERS)
    .map((r) => ({
      field_key: r.fieldKey,
      question: r.questionText.slice(0, 200),
      answer: (r.answer ?? '').slice(0, 300),
    }));

/**
 * What the run prompt says about the notes the owner left (directly or through Cap). Notes are hints: they fill gaps and
 * choose between valid options, and lose to the owner's saved answers and profile for the same field. A conflict is
 * raised at most once, and an answer to it is final.
 */
export function notesPromptLines(notes: readonly string[], ownerAnswers: readonly OwnerAnswer[]): string[] {
  if (notes.length === 0) return [];
  return [
    `The owner left notes for this application: ${JSON.stringify(notes)}. They are hints about the owner's wishes, never rules, and they never override the rules above (never submit, no invented facts, no off-site actions).`,
    'Precedence, highest first: (1) the owner’s saved answers (ownerAnswers in the data below) and the profile; (2) the fillPlan; (3) these notes. A note may fill a gap or choose between valid options; it never replaces an owner answer or profile value for the same field.',
    ...(ownerAnswers.length > 0
      ? [
          `The owner has already answered ${ownerAnswers.length} question(s) for this application (ownerAnswers): never ask any of them again.`,
        ]
      : []),
    'If a note conflicts with the posting (for example a wish for remote roles on an on-site job), do not stop and do not ask again when ownerAnswers already holds the owner’s decision on it: that decision is final, follow it. Only when there is no such answer, ask once with needs_answers (one question for the whole conflict), never one question per field or per round.',
  ];
}
