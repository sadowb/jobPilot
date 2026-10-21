import type { FunnelStage, RateRow } from './model';
import { ratePercent } from './model';

/** Sample data copied from the V17 Analytics board (placeholder, not product claims). */

export const RANGES = [
  { value: '8w', label: '8 weeks', caption: '8 weeks · Aug 25 – Oct 19' },
  { value: '30d', label: '30 days', caption: '30 days · Sep 20 – Oct 19' },
  { value: 'all', label: 'All time', caption: 'All time · since Aug 25' },
] as const;
export type RangeValue = (typeof RANGES)[number]['value'];

export const SPEND_LINE = 'This week $1.12 · 41 runs · median $0.013/run';

export const APPLICATIONS = 62;

export const FUNNEL_STAGES: readonly FunnelStage[] = [
  { label: 'Applied', value: 62, note: 'all applications' },
  { label: 'Recruiter reply', value: 7, note: `${ratePercent(7, 62)}% of applied` },
  { label: 'Interview', value: 1, note: '1 of 7 replies' },
  { label: 'Offer', value: 0, note: '0 of 1 interview' },
];

export const FUNNEL_READ =
  '7 recruiters replied, and 1 of those became an interview. The leak is after the first call.';

export const WEEKS = ['Aug 25', 'Sep 1', 'Sep 8', 'Sep 15', 'Sep 22', 'Sep 29', 'Oct 6', 'Oct 13'] as const;
export const WEEKLY_REPLY_RATE = [4, 5, 4, 6, 7, 6, 9, 11] as const;
export const REPLY_READ =
  'Rose from 4% to 11% in 8 weeks. Small sample: 7 replies in total, so each new reply moves it about 1.6 points.';

export interface BreakdownCard {
  id: string;
  title: string;
  sub: string;
  rows: readonly RateRow[];
  read: string;
}

export const BREAKDOWNS: readonly BreakdownCard[] = [
  {
    id: 'site',
    title: 'By site',
    sub: 'Where the crew applied',
    rows: [
      { name: 'Greenhouse', applied: 19, replies: 3 },
      { name: 'Ashby', applied: 18, replies: 3 },
      { name: 'Lever', applied: 8, replies: 1 },
      { name: 'Workday', applied: 17, replies: 0 },
    ],
    read: 'Workday: 0 of 17. Slow (about 50 min) and creates an account per tenant.',
  },
  {
    id: 'cv',
    title: 'By CV',
    sub: 'Same job board, different CV',
    rows: [
      { name: 'AI / ML CV', applied: 36, replies: 5, highlight: true },
      { name: 'Base CV', applied: 26, replies: 2 },
    ],
    read: 'AI / ML CV gets about 1.8x the replies per application (14% vs 8%). Cap prefers it for AI and solutions roles.',
  },
  {
    id: 'level',
    title: 'By role level',
    sub: 'What the title says',
    rows: [
      { name: 'New grad SWE', applied: 24, replies: 3 },
      { name: 'Early career', applied: 22, replies: 2 },
      { name: 'Non-SWE roles', applied: 16, replies: 2 },
    ],
    read: 'Rates are close across levels. Early-career SWE is lowest at 9%, on 22 applications.',
  },
];
