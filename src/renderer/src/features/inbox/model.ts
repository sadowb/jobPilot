import type { CritterState } from '../../components/critterState';

/** The three items that need the owner in the V17 sample, newest first. */
export type ItemId = 'figma' | 'brex' | 'notion';
/** `cap` is the pinned pilot thread; the rest are per-job agent threads. */
export type ThreadId = 'cap' | ItemId;

export type ItemTone = 'work' | 'bad' | 'need';

export interface InboxItem {
  id: ItemId;
  agent: string;
  critter: CritterState;
  /** Mono tag in the list row, e.g. "Draft to review". */
  tag: string;
  tone: ItemTone;
  preview: string;
  role: string;
  age: string;
  /** Header sub-line in the thread view. */
  meta: string;
}

export const INBOX_ITEMS: readonly InboxItem[] = [
  {
    id: 'figma',
    agent: 'Figma',
    critter: 'need',
    tag: 'Draft to review',
    tone: 'work',
    preview: 'Why Figma? (150 words) · Cap drafted it',
    role: 'Software Engineer, Early Career',
    age: '2m',
    meta: 'Greenhouse · San Francisco, CA · 1 answer to review',
  },
  {
    id: 'brex',
    agent: 'Brex',
    critter: 'block',
    tag: 'Human check',
    tone: 'bad',
    preview: 'Education dropdown won’t load · tried 3 times',
    role: 'Software Engineer, New Grad',
    age: '9m',
    meta: 'Greenhouse · New York, NY · stuck on Education for 9 min',
  },
  {
    id: 'notion',
    agent: 'Notion',
    critter: 'need',
    tag: 'Consent',
    tone: 'need',
    preview: 'Allow an AI notetaker in your Oct 23 interview?',
    role: 'Product Engineer, Early Career',
    age: '14m',
    meta: 'Ashby · San Francisco, CA · 1 consent to give',
  },
];

export const itemById = (id: ItemId): InboxItem => {
  const item = INBOX_ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`unknown inbox item: ${id}`);
  return item;
};

// ---------------------------------------------------------------- thread messages

export interface StepRow {
  tone: 'ok' | 'wait' | 'now';
  label: string;
  meta: string;
}

export interface MessageAction {
  label: string;
  variant: 'pri' | 'plain' | 'ghost';
}

export interface BriefStat {
  value: string;
  title: string;
  sub: string;
}

export interface BarRow {
  label: string;
  pct: number;
  value: string;
}

export interface EvidenceRow {
  source: string;
  text: string;
}

export type ThreadMessage =
  | { kind: 'day'; label: string }
  | { kind: 'steps'; title: string; rows: readonly StepRow[] }
  | { kind: 'bubble'; side: 'a' | 'u'; text: string; actions?: readonly MessageAction[] }
  | { kind: 'event'; text: string }
  | { kind: 'brief'; head: [string, string]; stats: readonly BriefStat[] }
  | { kind: 'bars'; head: [string, string]; rows: readonly BarRow[] }
  | { kind: 'evidence'; head: [string, string]; rows: readonly EvidenceRow[] }
  /** The pending-question widget; its interactive state lives in the page (see ReviewDraft). */
  | { kind: 'answer-review' }
  | { kind: 'consent'; question: string; detail: string };

export const FIGMA_QUESTION = {
  title: 'Why Figma? (150 words)',
  wordLimit: 150,
  draft:
    'Figma turned design into something a whole team does at once, in one file, and that is the kind of product I want to help build. I built JobPilot, a local application assistant run by a crew of browser agents with a React dashboard. The hard parts were ones Figma solves at far larger scale: keeping shared state consistent, letting people edit anything the machine writes, and keeping the common path fast. As an Early Career engineer I would like to work on the editor and multiplayer, ship small changes often, and write down what I learn so the next person starts further ahead.',
  provenance: 'Built from your AI / ML CV and your JobPilot project',
} as const;

const FIGMA_THREAD: readonly ThreadMessage[] = [
  { kind: 'day', label: 'Today · 9:14' },
  {
    kind: 'steps',
    title: 'Did 4 steps · 58 s',
    rows: [
      { tone: 'ok', label: 'Read the posting', meta: '4 s' },
      { tone: 'ok', label: 'Opened the Greenhouse form', meta: '1.1 s' },
      { tone: 'ok', label: 'Filled 13 of 14 fields', meta: '13' },
      { tone: 'wait', label: 'Stopped at 1 answer for you to review', meta: 'now' },
    ],
  },
  {
    kind: 'bubble',
    side: 'a',
    text: '13 fields came from your profile, your CV and saved answers. “Why Figma?” needs you, so I drafted it from your CV and the JobPilot project.',
  },
  { kind: 'answer-review' },
];

const BREX_BASE: readonly ThreadMessage[] = [
  { kind: 'day', label: 'Today · 9:31' },
  {
    kind: 'steps',
    title: 'Stuck · 3 tries',
    rows: [
      { tone: 'ok', label: 'Opened the Greenhouse form', meta: '1.1 s' },
      { tone: 'ok', label: 'Filled 12 of 13 fields', meta: '12' },
      { tone: 'wait', label: 'Education: no options load', meta: '3 tries' },
    ],
  },
  {
    kind: 'bubble',
    side: 'a',
    text: 'Education won’t take a value. The dropdown opens, but its list stays empty after three tries. It looks like a slow load, not a missing option, so I stopped instead of guessing.',
  },
];

/** Sample conversation shown once the owner takes over Brex (V17_TakeOver). Replace with real history. */
const BREX_TAKEOVER: readonly ThreadMessage[] = [
  { kind: 'event', text: 'You took over at 9:38 · this agent is paused and won’t type' },
  { kind: 'bubble', side: 'u', text: 'I’ll pick BSc Computer Science myself, then hand it back.' },
  {
    kind: 'bubble',
    side: 'a',
    text: 'Understood. When you hand back I’ll re-read the page and check Education before I submit.',
  },
];

const NOTION_THREAD: readonly ThreadMessage[] = [
  { kind: 'day', label: 'Today · 9:09' },
  {
    kind: 'bubble',
    side: 'a',
    text: 'Notion asked whether an AI notetaker may join your Oct 23 interview. That is your call, so I have not answered it.',
  },
  {
    kind: 'consent',
    question: 'Allow an AI notetaker in your Oct 23 interview?',
    detail: 'Interview with Priya Shah · Product Engineer, Early Career',
  },
];

const CAP_THREAD: readonly ThreadMessage[] = [
  { kind: 'day', label: 'Today · 9:00' },
  {
    kind: 'brief',
    head: ['Morning brief · Tue Oct 20', 'Cap · 9:00'],
    stats: [
      { value: '9', title: 'sent this week', sub: 'Mercury and Retool are being filled now' },
      { value: '1', title: 'interview', sub: 'Notion · Oct 23 · Priya Shah' },
      { value: '3', title: 'need you', sub: 'Figma draft · Brex check · Notion consent' },
    ],
  },
  { kind: 'bubble', side: 'u', text: 'Where are my replies coming from?' },
  {
    kind: 'bars',
    head: ['Reply rate by site · all 62 applications', '7 replies · 11%'],
    rows: [
      { label: 'Greenhouse', pct: 16, value: '3 of 19 · 16%' },
      { label: 'Ashby', pct: 17, value: '3 of 18 · 17%' },
      { label: 'Lever', pct: 13, value: '1 of 8 · 13%' },
      { label: 'Workday', pct: 0, value: '0 of 17 · 0%' },
    ],
  },
  { kind: 'bubble', side: 'u', text: 'Why was Perpay rejected?' },
  {
    kind: 'bubble',
    side: 'a',
    text: 'Perpay closed the role this morning by Greenhouse email, with no reason given. Three things in your record stand out:',
  },
  {
    kind: 'evidence',
    head: ['Evidence · from your record', '3 sources'],
    rows: [
      {
        source: 'Posting · Oct 19',
        text: 'Asked for interest in payments or lending. Your listed experience has none.',
      },
      { source: 'CV sent · Oct 19', text: 'AI / ML CV v4, which leads with agents and tooling, not fintech.' },
      { source: 'Form · Oct 19', text: 'All fields filled, 0 open questions. Submitted with no error.' },
    ],
  },
  {
    kind: 'bubble',
    side: 'a',
    text: 'I can’t prove the cause from this. One thing I can change: payments postings get the AI / ML CV today. Want a rule that sends them the Base CV instead?',
    actions: [
      { label: 'Create rule', variant: 'pri' },
      { label: 'Show Perpay', variant: 'plain' },
      { label: 'Not now', variant: 'ghost' },
    ],
  },
];

/** Static thread content. Dynamic parts (accept/edit state, takeover script, sent text) are layered on in `threadMessages`. */
export function baseThread(id: ThreadId, takenOver: boolean): readonly ThreadMessage[] {
  switch (id) {
    case 'cap':
      return CAP_THREAD;
    case 'figma':
      return FIGMA_THREAD;
    case 'brex':
      return takenOver ? [...BREX_BASE, ...BREX_TAKEOVER] : BREX_BASE;
    case 'notion':
      return NOTION_THREAD;
  }
}

// ---------------------------------------------------------------- right-hand panels

export const PILOT_RULES: readonly { text: string; suggested?: boolean }[] = [
  { text: 'Skip roles asking 3+ years' },
  { text: 'Salary floor $90k' },
  { text: 'Decline demographic questions' },
  { text: 'Max 4 at once' },
  { text: 'Skip Workday on weekends' },
  { text: 'Base CV for payments roles', suggested: true },
];

export interface QueueRow {
  agent: string;
  critter: CritterState;
  site: string;
  role: string;
  status: string;
}

export const UP_NEXT: readonly QueueRow[] = [
  { agent: 'Mercury', critter: 'work', site: 'Ashby', role: 'Software Engineer, New Grad', status: 'filling now' },
  { agent: 'Retool', critter: 'work', site: 'Ashby', role: 'Software Engineer, Early Career', status: 'filling now' },
  {
    agent: 'Duolingo',
    critter: 'idle',
    site: 'Greenhouse',
    role: 'Software Engineer, New Grad',
    status: 'next · ~2 min',
  },
];

export const CLEAR_STATS = [
  { label: 'Running', value: '2' },
  { label: 'Up next', value: '9' },
  { label: 'Sent this week', value: '9' },
] as const;

export const CAP_LIST_PREVIEW = {
  pending: 'Morning brief · 9 sent this week · 1 interview · 3 need you',
  clear: 'You cleared all 3 · nothing waiting',
  pendingTime: '9:00',
  clearTime: '11:20',
} as const;

export const SHORTCUTS_BY_VIEW = {
  review: [
    { keys: ['↵'], label: 'accept' },
    { keys: ['E'], label: 'edit' },
    { keys: ['S'], label: 'skip' },
    { keys: ['J', 'K'], label: 'next job' },
    { keys: ['T'], label: 'take over' },
    { keys: ['G'], label: 'go to tab' },
    { keys: ['⌘K'], label: 'ask Cap' },
  ],
  pilot: [
    { keys: ['↵'], label: 'send' },
    { keys: ['⌘K'], label: 'ask Cap anywhere' },
    { keys: ['Esc'], label: 'back to Inbox' },
  ],
  takeover: [
    { keys: ['H'], label: 'hand back' },
    { keys: ['G'], label: 'go to tab' },
    { keys: ['Esc'], label: 'back to chat' },
  ],
  clear: [
    { keys: ['⌘V'], label: 'add jobs' },
    { keys: ['⌘K'], label: 'ask Cap' },
  ],
} as const;
