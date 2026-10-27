/** Fact-question definitions (no personal sample data). */

export interface FactQuestion {
  /** Id of the stored common answer (see `answers.ts`). */
  id: 'sponsorship' | 'salary-floor' | 'relocate';
  /** Shown as the label and stored as the answer's question when the answer does not exist yet. */
  prompt: string;
  options: readonly string[];
}

export const FACT_QUESTIONS: readonly FactQuestion[] = [
  { id: 'sponsorship', prompt: 'Will you need visa sponsorship?', options: ['Yes, I need sponsorship', 'No, I don’t'] },
  {
    id: 'salary-floor',
    prompt: 'Lowest salary you’d apply for (per year)',
    options: ['$80k', '$90k', '$100k', 'No minimum'],
  },
  {
    id: 'relocate',
    prompt: 'Would you move for the right role?',
    options: ['Anywhere', 'Within 50 miles', 'Stay where I am'],
  },
];

export const FACT_USES: readonly { tag: string; text: string }[] = [
  { tag: 'AUTH', text: 'Used when a form asks about visa sponsorship.' },
  { tag: 'SALARY', text: 'Used when a form asks for your minimum salary.' },
  { tag: 'MOVE', text: 'Used when a form asks about relocating.' },
];
