import type { AgentState } from '../../components/v17-agent-state';

export type ApplicationStatus = 'submitted' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn' | 'closed';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

/** Who last set the status: the agent at submit time, an email the inbox parsed, or the user in the UI. */
export type StatusSource = 'agent' | 'email' | 'you';

export interface TimelineEvent {
  title: string;
  /** ISO date (YYYY-MM-DD). */
  on: string;
  by: 'the agent' | 'email' | 'you';
  /** Tone of the dot: neutral, or the status colour of the event that moved the application. */
  tone: 'neutral' | 'screening';
  /** Offered when an email moved the status and the user can reject that inference. */
  undoLabel?: string;
}

export interface ApplicationDetail {
  jobType: string;
  level: string;
  followUpOn: string | null;
  sponsorship: string;
  cvName: string;
  cvMeta: string;
  description: string;
  notes: string;
  timeline: TimelineEvent[];
}

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  workMode: WorkMode;
  status: ApplicationStatus;
  statusSource: StatusSource;
  /** ISO date the status was last set. */
  statusSetOn: string;
  /** Free-form, shown as-is (some postings carry none: "—"). */
  salary: string;
  site: string;
  /** ISO date. */
  appliedOn: string;
  agent: AgentState;
  postingUrl: string;
  detail: ApplicationDetail;
}

export type StatusFilter = 'all' | 'submitted' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
