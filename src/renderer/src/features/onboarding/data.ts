/** Sample data copied from the V17 onboarding boards (placeholder, not product claims). */

export interface CvField {
  label: string;
  /** Plain value, or a primary line plus a muted secondary line. */
  value: string;
  secondary?: string;
  chips?: readonly string[];
  /** Stagger delay in seconds for the row-in animation. */
  delay: number;
}

export const CV_FILE = { name: 'Benali_CV_2026.pdf', pages: 1, sizeKb: 184 } as const;

export const CV_FIELDS: readonly CvField[] = [
  { label: 'Name', value: 'Sara Benali', delay: 0.1 },
  { label: 'Email', value: 'a•••••98@gmail.com', delay: 0.2 },
  { label: 'Phone', value: '+212 6•• ••• •41', delay: 0.25 },
  { label: 'Location', value: 'Rabat, Morocco', delay: 0.3 },
  { label: 'Education', value: 'BSc Computer Science', secondary: 'Mohammed V University · 2026', delay: 0.4 },
  { label: 'Experience', value: '1 role · Teaching assistant, 2025–2026', delay: 0.5 },
  { label: 'Projects', value: '3 · JobPilot, Darija sentiment, Campus shuttle ETA', delay: 0.6 },
  {
    label: 'Skills',
    value: '',
    chips: ['Python', 'TypeScript', 'SQL', 'PyTorch', 'Git', 'Linux'],
    delay: 0.7,
  },
  { label: 'Languages', value: 'Arabic · Darija · French · English', delay: 0.75 },
];

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

export interface ChecklistItem {
  title: string;
  detail: string;
  /** Shorter wording the dashboard's side card uses. */
  shortDetail?: string;
}

export const SETUP_CHECKLIST: readonly ChecklistItem[] = [
  { title: 'CV read and checked', detail: 'Benali_CV_2026.pdf' },
  {
    title: 'Facts saved · 3',
    detail: 'Authorization, salary floor, relocation',
    shortDetail: 'Authorization, salary, relocation',
  },
  { title: 'First jobs queued · 3', detail: 'Mercury, Retool, Duolingo' },
];
