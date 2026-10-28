import type { AgentBotState } from '../../components/AgentBotArt';
import type { SiteMode, SubmitMode } from './model';

/** Sample data copied from the V17 Settings board (placeholder, not product claims). */

export interface SiteRow {
  name: string;
  stat: string;
  mode: SiteMode;
}

export const SITES: readonly SiteRow[] = [
  { name: 'Greenhouse', stat: '19 applied · 3 replies', mode: 'auto' },
  { name: 'Ashby', stat: '18 applied · 3 replies', mode: 'auto' },
  { name: 'Lever', stat: '8 applied · 1 reply', mode: 'assisted' },
  { name: 'Workday', stat: '17 applied · 0 replies · creates accounts', mode: 'assisted' },
];

export interface SiteLogin {
  id: string;
  host: string;
  meta: string;
}

export const SITE_LOGINS: readonly SiteLogin[] = [
  { id: 'sf-wd12', host: 'salesforce.wd12', meta: 'created by agent · Oct 11 · encrypted' },
];

export const SUBMIT_MODES: readonly { value: SubmitMode; title: string; body: string }[] = [
  { value: 'review', title: 'Review before send', body: 'You press Submit in the tab. Nothing leaves without you.' },
  {
    value: 'auto',
    title: 'Auto with limits',
    body: 'Crew submits once every answer is set and the limits below hold.',
  },
];

export const DEFAULT_SETTINGS = {
  autopilot: false,
  crew: 6,
  submitMode: 'review' as SubmitMode,
  sites: {} as Record<string, SiteMode>,
  limits: { openTabs: 8, costPerDay: 5, runSeconds: 540, stuckSeconds: 120 },
};

/** The dimmed dashboard the sheet slides over. */
export type ChipTone = 'rejected' | 'screening' | 'submitted' | 'interview' | 'withdrawn';

export interface BackdropRow {
  company: string;
  role: string;
  status: string;
  tone: ChipTone;
  site: string;
  applied: string;
  bot: AgentBotState;
}

export const BACKDROP_ROWS: readonly BackdropRow[] = [
  {
    company: 'Perpay',
    role: 'SWE New Grad (Super Day)',
    status: 'Rejected',
    tone: 'rejected',
    site: 'Greenhouse',
    applied: 'Oct 19',
    bot: 'idle',
  },
  {
    company: 'Clark',
    role: 'Jr Forward Deployed Eng',
    status: 'Rejected',
    tone: 'rejected',
    site: 'Ashby',
    applied: 'Oct 18',
    bot: 'idle',
  },
  {
    company: 'Ramp',
    role: 'Software Engineer, New Grad',
    status: 'Screening',
    tone: 'screening',
    site: 'Ashby',
    applied: 'Oct 17',
    bot: 'done',
  },
  {
    company: 'Datadog',
    role: 'Software Engineer I',
    status: 'Submitted',
    tone: 'submitted',
    site: 'Greenhouse',
    applied: 'Oct 16',
    bot: 'done',
  },
  {
    company: 'Notion',
    role: 'Product Engineer, Early Career',
    status: 'Interview',
    tone: 'interview',
    site: 'Ashby',
    applied: 'Oct 15',
    bot: 'need',
  },
  {
    company: 'Stripe',
    role: 'Abuse Investigator',
    status: 'Submitted',
    tone: 'submitted',
    site: 'Greenhouse',
    applied: 'Oct 14',
    bot: 'done',
  },
  {
    company: 'Plaid',
    role: 'Software Engineer I',
    status: 'Submitted',
    tone: 'submitted',
    site: 'Lever',
    applied: 'Oct 13',
    bot: 'done',
  },
  {
    company: 'Linear',
    role: 'Software Engineer',
    status: 'Submitted',
    tone: 'submitted',
    site: 'Ashby',
    applied: 'Oct 12',
    bot: 'done',
  },
  {
    company: 'Salesforce',
    role: 'Associate SWE',
    status: 'Submitted',
    tone: 'submitted',
    site: 'Workday',
    applied: 'Oct 11',
    bot: 'done',
  },
  {
    company: 'Vercel',
    role: 'Software Engineer, New Grad',
    status: 'Withdrawn',
    tone: 'withdrawn',
    site: 'Greenhouse',
    applied: 'Oct 9',
    bot: 'idle',
  },
];

export const CHIP_TONES: Record<ChipTone, { color: string; background: string }> = {
  rejected: { color: '#B5412F', background: 'rgba(181,65,47,.14)' },
  screening: { color: '#0F766E', background: 'rgba(15,118,110,.14)' },
  submitted: { color: 'var(--ink-2)', background: 'var(--line)' },
  interview: { color: '#B45309', background: 'rgba(180,83,9,.16)' },
  withdrawn: { color: 'var(--muted)', background: 'var(--line)' },
};
