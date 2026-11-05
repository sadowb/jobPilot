import type { ApplicationListItem, FillPlanDto, InboxEntry, ProfileData, RunSummaryDto } from '../../../shared/dto';

/** Strips anything that could close one of our data tags; the content is data, never instructions. */
export const asData = (value: string, max = 400) => value.replace(/<\/?[a-z_]+>/gi, ' ').slice(0, max);

const MAX_CV_CHARS = 3000;
const MAX_PLAN_LINES = 40;
const MAX_ANSWER_LINES = 25;

/**
 * A short, scrubbed picture of the owner for a chat turn: how they describe themselves and what they want. No contact
 * details, address, links, ids or documents; those never need to be in a chat prompt.
 */
export function profileSummary(profile: ProfileData, now: Date = new Date()): string[] {
  const p = profile.personal;
  if (!p) return ['Profile: not filled in yet'];
  const current = p.career.find((job) => job.end === 'present') ?? p.career.at(-1);
  const starts = p.career.map((job) => job.start).sort();
  const years = starts[0]
    ? Math.max(
        0,
        Math.floor(
          (now.getFullYear() * 12 +
            now.getMonth() -
            (Number(starts[0].slice(0, 4)) * 12 + Number(starts[0].slice(5)) - 1)) /
            12,
        ),
      )
    : null;
  const line = (label: string, value: string | null | undefined) =>
    value && value.trim() ? [`${label}: ${asData(value, 200)}`] : [];
  return [
    ...line('Name', [p.preferredName || p.firstName, p.lastName].filter(Boolean).join(' ')),
    ...line('Headline', p.headline),
    ...line('Current or latest role', current ? `${current.role} at ${current.organisation}` : p.role),
    ...line('Years of experience', years === null ? null : String(years)),
    ...line('Based in', [p.city, p.country].filter(Boolean).join(', ')),
    ...line('Wants', [p.role, p.workMode, p.locations].filter(Boolean).join(' | ')),
    ...line('Education', [p.degree, p.fieldOfStudy, p.school].filter(Boolean).join(', ')),
    ...line('Languages', p.languages.map((l) => (l.level ? `${l.language} (${l.level})` : l.language)).join(', ')),
    ...line('Bio', p.bio.slice(0, 400)),
  ];
}

export const cvExcerpt = (text: string | null): string =>
  text && text.trim() ? asData(text.replace(/\s+/g, ' ').trim(), MAX_CV_CHARS) : '(no CV text stored)';

export function fillPlanLines(plan: FillPlanDto): string[] {
  const lines = plan.entries.slice(0, MAX_PLAN_LINES).map((e) => {
    const what =
      e.action === 'ask' || e.action === 'skip'
        ? `${e.action}${e.note ? ` (${asData(e.note, 100)})` : ''}`
        : e.value
          ? `${asData(e.value, 120)}${e.source ? ` [${e.source}]` : ''}`
          : e.action;
    return `${asData(e.label, 100)}${e.required ? ' *' : ''} = ${what}`;
  });
  return [...lines, ...plan.unresolved_required.map((u) => `Still needs an answer: ${asData(u.label, 100)}`)];
}

export interface SavedAnswer {
  fieldKey: string;
  questionText: string;
  answer: string | null;
  source: string | null;
}

/** What the owner (or the agent) already answered for this application; the owner's answers come first. */
export function answerLines(rows: readonly SavedAnswer[]): string[] {
  return [...rows]
    .filter((r) => r.answer !== null && r.answer !== '')
    .sort((a, b) => Number(b.source === 'owner') - Number(a.source === 'owner'))
    .slice(0, MAX_ANSWER_LINES)
    .map((r) => `${asData(r.questionText, 140)} -> ${asData(r.answer ?? '', 200)} (${r.source ?? 'unknown'})`);
}

/* ---- Facts for Cap: counted and classified in code, never by the model ---- */

export type JobState =
  | 'running'
  | 'queued'
  | 'awaiting_owner_answers'
  | 'awaiting_owner_review'
  | 'owner_in_control'
  | 'failed'
  | 'submitted'
  | 'cancelled'
  | 'not_started';

export interface JobFact {
  applicationId: string;
  company: string;
  title: string;
  state: JobState;
  /** Why it is waiting or failed, when the app recorded a reason. */
  reason?: string;
  /** Where the posting conflicts with the owner's standing preferences (computed in code). */
  conflicts?: string[];
  runId?: string;
}

export interface CapFacts {
  total: number;
  counts: Record<JobState, number>;
  queuePaused: boolean;
  jobs: JobFact[];
}

const STATES: JobState[] = [
  'running',
  'queued',
  'awaiting_owner_answers',
  'awaiting_owner_review',
  'owner_in_control',
  'failed',
  'submitted',
  'cancelled',
  'not_started',
];

/**
 * The state of every application as the worker and the Inbox hold it: running = a run in `running`, waiting = an Inbox
 * entry, failed = the latest run failed (with its recorded reason). `runs` is the run list, `entries` the Inbox.
 */
export function computeFacts(input: {
  applications: readonly ApplicationListItem[];
  runs: readonly RunSummaryDto[];
  entries: readonly InboxEntry[];
  queuePaused: boolean;
  conflictsFor?: (application: ApplicationListItem) => string[];
}): CapFacts {
  const runById = new Map(input.runs.map((r) => [r.id, r]));
  const entryByApplication = new Map(input.entries.map((e) => [e.applicationId, e]));
  const counts = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<JobState, number>;
  const jobs = input.applications.map((a): JobFact => {
    const entry = entryByApplication.get(a.id);
    const latest = a.latestRunId ? runById.get(a.latestRunId) : undefined;
    const base = {
      applicationId: a.id,
      company: a.companyName,
      title: a.title,
      ...(latest ? { runId: latest.id } : {}),
    };
    let fact: JobFact;
    if (entry?.kind === 'approval') fact = { ...base, state: 'awaiting_owner_review' };
    else if (entry?.kind === 'needs_you')
      fact = { ...base, state: 'awaiting_owner_answers', ...(entry.reason ? { reason: entry.reason } : {}) };
    else if (a.appliedAt !== null || a.latestRunStatus === 'submitted') fact = { ...base, state: 'submitted' };
    else {
      const state: JobState =
        a.latestRunStatus === null
          ? 'not_started'
          : a.latestRunStatus === 'awaiting_approval'
            ? 'awaiting_owner_review'
            : a.latestRunStatus === 'needs_you'
              ? 'awaiting_owner_answers'
              : a.latestRunStatus;
      fact = { ...base, state, ...(state === 'failed' && latest?.error ? { reason: latest.error } : {}) };
    }
    const conflicts = input.conflictsFor?.(a) ?? [];
    if (conflicts.length) fact.conflicts = conflicts;
    counts[fact.state] += 1;
    return fact;
  });
  return { total: jobs.length, counts, queuePaused: input.queuePaused, jobs };
}

const LABEL: Record<JobState, string> = {
  running: 'running now',
  queued: 'queued, waiting for the worker',
  awaiting_owner_answers: 'waiting for the owner to answer',
  awaiting_owner_review: 'filled, waiting for the owner to review',
  owner_in_control: 'the owner has taken over',
  failed: 'failed',
  submitted: 'submitted',
  cancelled: 'cancelled',
  not_started: 'not started',
};

/** The facts block for the prompt: totals first, then one line per job. Counts here are authoritative. */
export function renderFacts(facts: CapFacts, maxJobs = 30): string[] {
  const nonzero = STATES.filter((s) => facts.counts[s] > 0).map((s) => `${facts.counts[s]} ${LABEL[s]}`);
  return [
    `Total applications: ${facts.total}${nonzero.length ? ` (${nonzero.join('; ')})` : ''}`,
    `Queue: ${facts.queuePaused ? 'paused' : 'running'}`,
    'id | company | role | state | reason',
    ...facts.jobs
      .slice(0, maxJobs)
      .map(
        (j) =>
          `${j.applicationId} | ${asData(j.company, 80)} | ${asData(j.title, 120)} | ${LABEL[j.state]}${j.reason ? ` | ${asData(j.reason, 200)}` : ''}${j.conflicts?.length ? ` | conflicts with the owner's preferences: ${asData(j.conflicts.join('; '), 200)}` : ''}`,
      ),
    ...(facts.jobs.length > maxJobs ? [`(${facts.jobs.length - maxJobs} more not listed)`] : []),
  ];
}
