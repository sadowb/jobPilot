import type { InboxEntry } from '../../../../shared/dto';
import type { AgentState } from '../../components/v17-agent-state';

export type ItemTone = 'work' | 'bad' | 'need';

/** One row of the thread list, derived from a real Inbox entry. */
export interface InboxItem {
  key: string;
  agent: string;
  state: AgentState;
  /** Mono tag in the list row. */
  tag: string;
  tone: ItemTone;
  preview: string;
  role: string;
  age: string;
}

export const entryKey = (entry: InboxEntry): string => (entry.kind === 'approval' ? entry.approvalId : entry.runId);

export function formatAge(at: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export const agentWritten = (entry: Extract<InboxEntry, { kind: 'approval' }>) =>
  entry.summary.answers.filter((answer) => answer.source === 'agent');

export function entryToItem(entry: InboxEntry, now = Date.now()): InboxItem {
  const base = { key: entryKey(entry), agent: entry.company, role: entry.title, age: formatAge(entry.createdAt, now) };
  if (entry.kind === 'approval') {
    const written = agentWritten(entry).length;
    return entry.state === 'submitting'
      ? { ...base, state: 'work', tag: 'Submitting', tone: 'work', preview: 'Approved · sending now' }
      : {
          ...base,
          state: 'need',
          tag: 'Review',
          tone: 'need',
          preview: `${entry.summary.fields.length} fields ready${written ? ` · ${written} written by the agent` : ''}`,
        };
  }
  return entry.questions.length > 0
    ? {
        ...base,
        state: 'need',
        tag: 'Question',
        tone: 'need',
        preview: entry.questions.length === 1 ? entry.questions[0]!.question : `${entry.questions.length} questions`,
      }
    : { ...base, state: 'block', tag: 'Stuck', tone: 'bad', preview: entry.reason ?? 'Needs a hand' };
}

export interface StepRow {
  tone: 'ok' | 'wait' | 'now';
  label: string;
  meta: string;
}

/** Shortcuts shown on the footer bar. Only keys that are bound are listed. */
export const SHORTCUTS = {
  approval: [
    { keys: ['↵'], label: 'approve' },
    { keys: ['R'], label: 'reject' },
    { keys: ['J', 'K'], label: 'next job' },
    { keys: ['/'], label: 'search' },
  ],
  needs_you: [
    { keys: ['J', 'K'], label: 'next job' },
    { keys: ['/'], label: 'search' },
  ],
  pilot: [{ keys: ['J', 'K'], label: 'next job' }],
  clear: [{ keys: ['/'], label: 'search' }],
} as const;
