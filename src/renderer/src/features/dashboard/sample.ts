import type { Application, ApplicationDetail } from './types';

/**
 * In-memory sample data copied from the V17 boards. Placeholder only: the board shows 10 of 62 applications,
 * so list totals come from SAMPLE_TOTALS and only these ten rows exist.
 */
export const SAMPLE_TOTALS = {
  applied: 62,
  upNext: 9,
  /** Counts the status chips show when no search is active (board: All 62 · Submitted 41 · ...). */
  byFilter: { all: 62, submitted: 41, screening: 6, interview: 1, offer: 0, rejected: 12, withdrawn: 2 },
  perPage: 10,
  pages: 7,
} as const;

export const SAMPLE_STATS = [
  { label: 'APPLIED', value: '62', sub: '+9 this week' },
  { label: 'REPLY RATE', value: '11%', sub: '7 of 62 heard back' },
  { label: 'INTERVIEWS', value: '1', sub: 'Notion · Oct 23' },
  { label: 'AVG. TO REJECTION', value: '2.4 d', sub: '12 rejections' },
] as const;

/** Detail a row gets when the boards draw none: what the agent itself knows about the submission. */
function defaultDetail(company: string, role: string): ApplicationDetail {
  return {
    jobType: 'Full-time',
    level: 'Entry',
    followUpOn: null,
    sponsorship: 'Not stated',
    cvName: 'AI / ML CV v4',
    cvMeta: '1 page · PDF · 212 KB · pinned at submit',
    description: `${role} at ${company}. The full description is on the posting.`,
    notes: '',
    timeline: [],
  };
}

const RAMP_DETAIL: ApplicationDetail = {
  jobType: 'Full-time',
  level: 'Entry',
  followUpOn: '2026-10-26',
  sponsorship: 'Not stated',
  cvName: 'AI / ML CV v4',
  cvMeta: '1 page · PDF · 212 KB · pinned at submit',
  description: 'Build Ramp’s spend-management product end to end in TypeScript, Python and Postgres.',
  notes: 'Recruiter: Dana · reply by Fri',
  timeline: [
    { title: 'Submitted by the Ramp agent', on: '2026-10-17', by: 'the agent', tone: 'neutral' },
    { title: 'Acknowledgement email', on: '2026-10-17', by: 'email', tone: 'neutral' },
    {
      title: 'Recruiter email → Screening',
      on: '2026-10-19',
      by: 'email',
      tone: 'screening',
      undoLabel: 'Not this job',
    },
  ],
};

type Row = Omit<Application, 'detail' | 'statusSource' | 'statusSetOn'> &
  Partial<Pick<Application, 'detail' | 'statusSource' | 'statusSetOn'>>;

const row = (r: Row): Application => ({
  statusSource: 'agent',
  statusSetOn: r.appliedOn,
  detail: defaultDetail(r.company, r.role),
  ...r,
});

export const SAMPLE_APPLICATIONS: Application[] = [
  row({
    id: 'perpay',
    company: 'Perpay',
    role: 'SWE New Grad (Super Day)',
    location: 'Philadelphia, PA',
    workMode: 'Hybrid',
    status: 'rejected',
    salary: '$110–125k',
    site: 'Greenhouse',
    appliedOn: '2026-10-19',
    agent: 'block',
    postingUrl: 'https://boards.greenhouse.io/perpay',
  }),
  row({
    id: 'clark',
    company: 'Clark',
    role: 'Jr Forward Deployed Eng',
    location: 'New York, NY',
    workMode: 'On-site',
    status: 'rejected',
    salary: '—',
    site: 'Ashby',
    appliedOn: '2026-10-18',
    agent: 'block',
    postingUrl: 'https://jobs.ashbyhq.com/clark',
  }),
  row({
    id: 'ramp',
    company: 'Ramp',
    role: 'Software Engineer, New Grad',
    location: 'New York, NY',
    workMode: 'On-site',
    status: 'screening',
    statusSource: 'email',
    statusSetOn: '2026-10-19',
    salary: '$150–175k',
    site: 'Ashby',
    appliedOn: '2026-10-17',
    agent: 'done',
    postingUrl: 'https://jobs.ashbyhq.com/ramp',
    detail: RAMP_DETAIL,
  }),
  row({
    id: 'datadog',
    company: 'Datadog',
    role: 'Software Engineer I',
    location: 'Boston, MA',
    workMode: 'Hybrid',
    status: 'submitted',
    salary: '$115–150k',
    site: 'Greenhouse',
    appliedOn: '2026-10-16',
    agent: 'idle',
    postingUrl: 'https://boards.greenhouse.io/datadog',
  }),
  row({
    id: 'notion',
    company: 'Notion',
    role: 'Product Engineer, Early Career',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    status: 'interview',
    salary: '$140–170k',
    site: 'Ashby',
    appliedOn: '2026-10-15',
    agent: 'need',
    postingUrl: 'https://jobs.ashbyhq.com/notion',
  }),
  row({
    id: 'stripe',
    company: 'Stripe',
    role: 'Abuse Investigator',
    location: 'Seattle, WA',
    workMode: 'On-site',
    status: 'submitted',
    salary: '$98–147k',
    site: 'Greenhouse',
    appliedOn: '2026-10-14',
    agent: 'idle',
    postingUrl: 'https://boards.greenhouse.io/stripe',
  }),
  row({
    id: 'plaid',
    company: 'Plaid',
    role: 'Software Engineer I',
    location: 'Remote · US',
    workMode: 'Remote',
    status: 'submitted',
    salary: '$125–150k',
    site: 'Lever',
    appliedOn: '2026-10-13',
    agent: 'idle',
    postingUrl: 'https://jobs.lever.co/plaid',
  }),
  row({
    id: 'linear',
    company: 'Linear',
    role: 'Software Engineer',
    location: 'Remote · Americas',
    workMode: 'Remote',
    status: 'submitted',
    salary: '—',
    site: 'Ashby',
    appliedOn: '2026-10-12',
    agent: 'idle',
    postingUrl: 'https://jobs.ashbyhq.com/linear',
  }),
  row({
    id: 'salesforce',
    company: 'Salesforce',
    role: 'Associate SWE',
    location: 'Dallas, TX',
    workMode: 'Hybrid',
    status: 'submitted',
    salary: '$103–140k',
    site: 'Workday',
    appliedOn: '2026-10-11',
    agent: 'idle',
    postingUrl: 'https://salesforce.wd12.myworkdayjobs.com/',
  }),
  row({
    id: 'vercel',
    company: 'Vercel',
    role: 'Software Engineer, New Grad',
    location: 'Remote · US',
    workMode: 'Remote',
    status: 'withdrawn',
    salary: '$128–160k',
    site: 'Greenhouse',
    appliedOn: '2026-10-09',
    agent: 'idle',
    postingUrl: 'https://boards.greenhouse.io/vercel',
  }),
];
