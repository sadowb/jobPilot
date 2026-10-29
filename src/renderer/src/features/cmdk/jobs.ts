import type { CritterState } from '../../components/critterState';

export const JOB_STATUSES = ['Submitted', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** What a command can set: the owner outcomes main accepts (OwnerStatus). Screening has no stored status yet. */
export type SettableStatus = Exclude<JobStatus, 'Screening'>;
export const SETTABLE_STATUSES = JOB_STATUSES.filter((s): s is SettableStatus => s !== 'Screening');

export interface JobRecord {
  id: string;
  company: string;
  role: string;
  ats: string;
  location: string;
  status: JobStatus;
  applied: string;
  critter: CritterState;
  /** Why the record sits in its status, as the answer pane quotes it. */
  statusNote?: string;
  statusSince?: string;
  statusReason?: string;
  followUp?: { date: string; source: string };
  emails?: number;
}

/** Fixture records for tests (the V17 dashboard rows). The app builds real ones in ./applications.ts. */
export const SAMPLE_JOBS: readonly JobRecord[] = [
  {
    id: 'perpay',
    company: 'Perpay',
    role: 'SWE New Grad (Super Day)',
    ats: 'Greenhouse',
    location: 'Philadelphia, PA',
    status: 'Rejected',
    applied: 'Oct 19',
    critter: 'block',
  },
  {
    id: 'clark',
    company: 'Clark',
    role: 'Jr Forward Deployed Eng',
    ats: 'Ashby',
    location: 'New York, NY',
    status: 'Rejected',
    applied: 'Oct 18',
    critter: 'block',
  },
  {
    id: 'ramp',
    company: 'Ramp',
    role: 'Software Engineer, New Grad',
    ats: 'Ashby',
    location: 'New York, NY',
    status: 'Screening',
    applied: 'Oct 17',
    critter: 'done',
    statusNote: 'got contacted',
    statusSince: 'Oct 19',
    statusReason: 'Dana emailed to set up a recruiter call',
    followUp: { date: 'Mon Oct 26', source: 'Dana’s email' },
    emails: 2,
  },
  {
    id: 'datadog',
    company: 'Datadog',
    role: 'Software Engineer I',
    ats: 'Greenhouse',
    location: 'Boston, MA',
    status: 'Submitted',
    applied: 'Oct 16',
    critter: 'idle',
  },
  {
    id: 'notion',
    company: 'Notion',
    role: 'Product Engineer, Early Career',
    ats: 'Ashby',
    location: 'San Francisco, CA',
    status: 'Interview',
    applied: 'Oct 15',
    critter: 'need',
  },
  {
    id: 'stripe',
    company: 'Stripe',
    role: 'Abuse Investigator',
    ats: 'Greenhouse',
    location: 'Seattle, WA',
    status: 'Submitted',
    applied: 'Oct 14',
    critter: 'idle',
  },
  {
    id: 'plaid',
    company: 'Plaid',
    role: 'Software Engineer I',
    ats: 'Lever',
    location: 'Remote · US',
    status: 'Submitted',
    applied: 'Oct 13',
    critter: 'idle',
  },
  {
    id: 'linear',
    company: 'Linear',
    role: 'Software Engineer',
    ats: 'Ashby',
    location: 'Remote · Americas',
    status: 'Submitted',
    applied: 'Oct 12',
    critter: 'idle',
  },
  {
    id: 'salesforce',
    company: 'Salesforce',
    role: 'Associate SWE',
    ats: 'Workday',
    location: 'Dallas, TX',
    status: 'Submitted',
    applied: 'Oct 11',
    critter: 'idle',
  },
  {
    id: 'vercel',
    company: 'Vercel',
    role: 'Software Engineer, New Grad',
    ats: 'Greenhouse',
    location: 'Remote · US',
    status: 'Withdrawn',
    applied: 'Oct 9',
    critter: 'idle',
  },
];

/** Chip colours: the boards' own for five statuses; Offer is not drawn anywhere, so it borrows the brand wash. */
export const STATUS_CHIP: Record<JobStatus, { color: string; background: string }> = {
  Submitted: { color: 'var(--ink-2)', background: 'var(--line)' },
  Interview: { color: '#B45309', background: 'rgba(180,83,9,.16)' },
  Screening: { color: '#0F766E', background: 'rgba(15,118,110,.14)' },
  Offer: { color: 'var(--brand-text)', background: 'var(--brand-tint)' },
  Rejected: { color: '#B5412F', background: 'rgba(181,65,47,.14)' },
  Withdrawn: { color: 'var(--muted)', background: 'var(--line)' },
};
