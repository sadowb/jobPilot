/** Fact-question definitions (no personal sample data). */

export interface FactQuestion {
  id: 'auth' | 'salary' | 'move';
  prompt: string;
  options: readonly string[];
}

export const FACT_QUESTIONS: readonly FactQuestion[] = [
  {
    id: 'auth',
    prompt: '1 of 3 · Work authorization. Do you need visa sponsorship in the US?',
    options: ['Yes, I need sponsorship', 'No, I don’t'],
  },
  {
    id: 'salary',
    prompt: '2 of 3 · Lowest salary you’d apply for. Roles below it are held in Up next, never dropped.',
    options: ['$80k', '$90k', '$100k', 'No minimum', 'Custom'],
  },
  {
    id: 'move',
    prompt: '3 of 3 · Would you move for the right role?',
    options: ['Anywhere in the US', 'Within 50 miles', 'Stay where I am'],
  },
];

export const FACT_USES: readonly { tag: string; text: string }[] = [
  { tag: 'AUTH', text: 'Answers sponsorship questions. Flags roles that need it.' },
  { tag: 'SALARY', text: 'Roles under your floor wait in Up next, marked.' },
  { tag: 'MOVE', text: 'On-site roles outside your range are filtered.' },
];
