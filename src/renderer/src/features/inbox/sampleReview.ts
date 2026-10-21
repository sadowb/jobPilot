/** Sample "what will be sent" payload for the Figma application (V17_Inbox). Replaced by the API later. */
export interface ReviewSample {
  site: string;
  fieldCount: number;
  cv: { name: string; meta: string };
  question: string;
  filled: readonly string[];
  files: readonly string[];
  filesNote: string;
  saved: readonly { label: string; value: string; note?: string }[];
}

export const FIGMA_REVIEW: ReviewSample = {
  site: 'Figma · Greenhouse',
  fieldCount: 14,
  cv: { name: 'AI / ML CV v4', meta: 'PDF · 1 page · goes with this application' },
  question: 'Why Figma? (150 words)',
  filled: [
    'Name',
    'email',
    'phone',
    'LinkedIn',
    'GitHub',
    'location',
    'work authorization',
    'notice period',
    'start date',
  ],
  files: ['AI / ML CV v4.pdf'],
  filesNote: 'no cover letter requested',
  saved: [
    { label: 'Sponsorship', value: 'from your profile', note: 'owner decision' },
    { label: 'Work in office', value: 'Hybrid, or remote' },
    { label: 'How you heard', value: 'LinkedIn' },
  ],
};
