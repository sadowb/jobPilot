import type { FactsState } from './model';

/** Sample data copied from the V17 Profile board (placeholder, not product claims). */

export interface CvDoc {
  id: string;
  name: string;
  version: string;
  meta: string;
  blurb: string;
  defaultFor: string;
  /** The first thumbnail uses a brand-coloured heading bar. */
  accent: boolean;
}

export const CV_DOCS: readonly CvDoc[] = [
  {
    id: 'ai',
    name: 'AI / ML CV',
    version: 'v4',
    meta: '1 page · updated Oct 19 · sent 36 times, 5 replies',
    blurb: 'Used for AI, solutions and forward-deployed roles. Cap picks it first for those.',
    defaultFor: 'Default · AI / ML',
    accent: true,
  },
  {
    id: 'base',
    name: 'Base CV',
    version: 'v2',
    meta: '1 page · updated Oct 2 · sent 26 times, 2 replies',
    blurb: 'Used for ops, analyst and new-grad SWE roles.',
    defaultFor: 'Default · other',
    accent: false,
  },
];

export const THUMB_LINES = ['94%', '78%', '88%', '62%', '90%', '70%', '84%', '46%'] as const;

export const TRANSCRIPT = {
  file: 'Transcript.pdf',
  meta: '1 page · uploaded Oct 3 · read by Cap',
  facts: [
    { label: 'Degree', value: 'BSc Computer Science' },
    { label: 'Graduation', value: '2026, parsed from the file' },
    { label: 'Used for', value: 'Dates and degree questions' },
  ],
} as const;

export interface LinkCheck {
  label: string;
  value: string;
  status: string;
}

export const LINKS: readonly LinkCheck[] = [
  { label: 'Website', value: 'sara-benali.example', status: '● checked today' },
  { label: 'GitHub', value: 'github.com/sara-benali-example', status: '● 14 public repos' },
  { label: 'LinkedIn', value: 'in/sara-benali-example', status: '● checked Oct 18' },
];

export const BASE_LETTER = {
  template: '1 template · 180 words',
  tones: [
    { value: 'formal', label: 'Formal' },
    { value: 'direct', label: 'Direct' },
    { value: 'warm', label: 'Warm' },
  ],
} as const;

export const INITIAL_FACTS: FactsState = {
  review: [
    { id: 'notice', text: 'Notice period · Immediately', source: 'Found on the Ramp form · Oct 17' },
    { id: 'tz', text: 'Time zone · GMT+1 · Morocco', source: 'Inferred from your CV location · Oct 3' },
    { id: 'grad', text: 'Graduation · June 2026', source: 'Read from Transcript.pdf · Oct 3' },
  ],
  confirmed: [],
  priorConfirmed: 27,
};

export interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  setBy: 'you' | 'agent';
  note: string;
}

export const SAVED_ANSWERS: readonly SavedAnswer[] = [
  { id: 'start', question: 'Earliest start date', answer: 'Immediately', setBy: 'you', note: '· Oct 2' },
  {
    id: 'hear',
    question: 'How did you hear about us?',
    answer: 'LinkedIn',
    setBy: 'agent',
    note: '· Ashby form · Oct 17',
  },
  {
    id: 'office',
    question: 'Willing to work in the office?',
    answer: 'Hybrid, or remote',
    setBy: 'you',
    note: '· Oct 9',
  },
  {
    id: 'why',
    question: 'Why this company?',
    answer: 'I build agents that do real work, and I ship small changes every day.',
    setBy: 'agent',
    note: '· Ramp · agent draft, edited by you',
  },
];

export const SAVED_TOTAL = 182;
export const SAVED_SPLIT = 'Global 146 · per job 36';
