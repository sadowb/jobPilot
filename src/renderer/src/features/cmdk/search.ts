import { SETTABLE_STATUSES, type JobRecord, type SettableStatus } from './jobs';

/** What running a result does. The host decides how (API call, navigation); the box only reports intent. */
export type CommandIntent =
  | { type: 'set-status'; jobId: string; status: SettableStatus }
  | { type: 'open-job'; jobId: string }
  | { type: 'ask'; query: string };

export type ResultHint = '↵' | '⇥' | null;

export interface CommandResult {
  id: string;
  kind: 'action' | 'job' | 'ask';
  title: string;
  subtitle: string;
  jobId?: string;
  intent: CommandIntent;
  hint: ResultHint;
}

export interface ResultSection {
  label: 'Actions' | 'Jobs' | 'Ask Cap';
  results: readonly CommandResult[];
}

export const normalize = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

export interface StatusCommand {
  companyQuery: string;
  status: SettableStatus;
}

/** "set ramp to interview" / "move ramp to interview" / "mark ramp as rejected". A unique status prefix is accepted. */
export function parseStatusCommand(query: string): StatusCommand | null {
  const m = /^(?:set|move|mark)\s+(.+?)\s+(?:to|as)\s+(\S.*)$/i.exec(normalize(query));
  if (!m) return null;
  const [, companyQuery, wanted] = m;
  const exact = SETTABLE_STATUSES.find((s) => s.toLowerCase() === wanted);
  const prefixed = SETTABLE_STATUSES.filter((s) => s.toLowerCase().startsWith(wanted!));
  const status = exact ?? (prefixed.length === 1 ? prefixed[0] : undefined);
  return status ? { companyQuery: companyQuery!, status } : null;
}

const MAX_JOBS = 3;

export function matchJobs(text: string, jobs: readonly JobRecord[]): JobRecord[] {
  const q = normalize(text);
  if (!q) return [];
  const rank = (j: JobRecord) => {
    const c = j.company.toLowerCase();
    if (c === q) return 0;
    if (c.startsWith(q)) return 1;
    if (c.includes(q)) return 2;
    return `${c} ${j.role.toLowerCase()}`.includes(q) ? 3 : 4;
  };
  return jobs
    .map((j) => [j, rank(j)] as const)
    .filter(([, r]) => r < 4)
    .sort((a, b) => a[1] - b[1])
    .map(([j]) => j);
}

const jobTitle = (j: JobRecord) => `${j.company} · ${j.role}`;
const jobSubtitle = (j: JobRecord) => `${j.ats} · ${j.location} · applied ${j.applied}`;

export function setStatusSubtitle(job: JobRecord, to: SettableStatus): string {
  const from = job.statusNote ? `${job.status} · ${job.statusNote}` : job.status;
  return `${from} → ${to}${job.followUp ? ` · follow-up ${job.followUp.date}` : ''}`;
}

/** Sections for the box, in the order the board draws them: Actions, Jobs, Ask Cap. */
export function buildResults(query: string, jobs: readonly JobRecord[]): ResultSection[] {
  const q = normalize(query);
  if (!q) {
    // Not drawn on a board: an empty box offers the latest jobs.
    return [{ label: 'Jobs', results: jobs.slice(0, MAX_JOBS).map(jobResult) }];
  }
  const cmd = parseStatusCommand(q);
  const matched = matchJobs(cmd ? cmd.companyQuery : q, jobs);
  const top = matched[0];
  const actions: CommandResult[] = [];
  if (top) {
    if (cmd && top.status !== cmd.status) {
      actions.push({
        id: `set:${top.id}:${cmd.status}`,
        kind: 'action',
        title: `Set ${top.company} → ${cmd.status}`,
        subtitle: setStatusSubtitle(top, cmd.status),
        jobId: top.id,
        intent: { type: 'set-status', jobId: top.id, status: cmd.status },
        hint: '↵',
      });
    }
  }
  const sections: ResultSection[] = [];
  if (actions.length) sections.push({ label: 'Actions', results: actions });
  if (matched.length) sections.push({ label: 'Jobs', results: matched.slice(0, MAX_JOBS).map(jobResult) });
  sections.push({
    label: 'Ask Cap',
    results: [
      {
        id: 'ask',
        kind: 'ask',
        title: `“${query.trim()}”`,
        subtitle: 'Ask Cap · answers inline, changes nothing until you confirm',
        intent: { type: 'ask', query: query.trim() },
        hint: '⇥',
      },
    ],
  });
  return sections;
}

function jobResult(j: JobRecord): CommandResult {
  return {
    id: `job:${j.id}`,
    kind: 'job',
    title: jobTitle(j),
    subtitle: jobSubtitle(j),
    jobId: j.id,
    intent: { type: 'open-job', jobId: j.id },
    hint: null,
  };
}

export const flatten = (sections: readonly ResultSection[]): CommandResult[] => sections.flatMap((s) => s.results);

/** Wraps; 0 when empty. */
export function moveIndex(index: number, dir: 1 | -1, count: number): number {
  return count === 0 ? 0 : (index + dir + count) % count;
}

// ---------------------------------------------------------------- answers

export interface Answer {
  /** e.g. "answer · read the Ramp record and 2 emails · 1.2 s" */
  meta: string;
  intro: string;
  rows: readonly { label: string; text: string }[];
  note: string;
  /** Primary action of the answer pane, if the answer proposes a change. */
  primary?: { label: string; intent: CommandIntent };
}

/**
 * Canned, local answer. Only status-change commands are understood in this build; anything else says so
 * instead of inventing an answer. SEAM: replace with the Cap API (typed Answer in, same pane out).
 */
export function answerFor(query: string, jobs: readonly JobRecord[]): Answer | null {
  const cmd = parseStatusCommand(query);
  if (!cmd) return null;
  const job = matchJobs(cmd.companyQuery, jobs)[0];
  if (!job || job.status === cmd.status) return null;
  const since = job.statusSince
    ? ` Its record has sat at ${job.status} since ${job.statusSince}${job.statusReason ? `, when ${job.statusReason}` : ''}.`
    : '';
  const rows = [
    { label: 'Status', text: `${job.status} → ${cmd.status}. Set by you.` },
    ...(job.followUp
      ? [
          {
            label: 'Follow-up',
            text: `${job.followUp.date}, taken from ${job.followUp.source}. Reminder the business day before.`,
          },
        ]
      : []),
    {
      label: 'Dashboard',
      text: `${job.company} moves into the ${cmd.status} filter. Nothing is sent to ${job.company}.`,
    },
  ];
  return {
    meta: `answer · read the ${job.company} record${job.emails ? ` and ${job.emails} emails` : ''}`,
    intro: `I can set ${job.company} to ${cmd.status}.${since} This is what would change:`,
    rows,
    note: `I haven’t changed anything yet. Press ↵ to set it, or open the thread in Inbox to add context first.`,
    primary: {
      label: `Set to ${cmd.status}`,
      intent: { type: 'set-status', jobId: job.id, status: cmd.status },
    },
  };
}

/** Why `answerFor` has nothing to offer, in the pane's own voice. */
export function noAnswerFor(query: string, jobs: readonly JobRecord[]): string {
  const cmd = parseStatusCommand(query);
  if (!cmd) return 'I can only change statuses so far, for example “set ramp to interview”.';
  const job = matchJobs(cmd.companyQuery, jobs)[0];
  if (!job) {
    return `No submitted application matches “${cmd.companyQuery}”. Status changes apply to applications you’ve sent.`;
  }
  return job.status === cmd.status ? `${job.company} is already ${cmd.status}.` : 'I can’t change that status.';
}
