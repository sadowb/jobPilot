import type { AgentState } from '../../../components/v17-agent-state';

export type QueueSource = 'Extension' | 'Pasted' | 'Sheet';
/** running: a worker has the job open. waiting: the agent stopped and needs you. queued: not started. held: paused by you. */
export type QueueStage = 'running' | 'waiting' | 'queued' | 'held';
export type QueueFilter = 'all' | 'running' | 'waiting' | 'held' | QueueSource;

export interface QueueItem {
  id: string;
  company: string;
  role: string;
  site: string;
  /** Extra line under the site, e.g. "creates a site account". */
  siteNote?: string;
  /** Disambiguates rows with the same role, shown on hover (e.g. the location). */
  hint?: string;
  /** Estimated minutes of crew time; 0 means the runs engine has no estimate yet. */
  estimateMin: number;
  source: QueueSource;
  stage: QueueStage;
  agent: AgentState;
  /** Why a waiting job stopped. */
  waitReason?: 'Draft to review' | 'Human check';
  /** Wall-clock time the user held it, "HH:MM". */
  heldAt?: string;
}

export const CREW_SIZE = 4;
/** How long a removal can be undone. The toast shows the seconds left. */
export const UNDO_WINDOW_MS = 8000;

export const SAMPLE_QUEUE: QueueItem[] = [
  {
    id: 'mercury',
    company: 'Mercury',
    role: 'Software Engineer, New Grad',
    site: 'Ashby',
    estimateMin: 2,
    source: 'Extension',
    stage: 'running',
    agent: 'work',
  },
  {
    id: 'retool',
    company: 'Retool',
    role: 'Software Engineer, Early Career',
    site: 'Ashby',
    estimateMin: 2,
    source: 'Pasted',
    stage: 'running',
    agent: 'work',
  },
  {
    id: 'figma',
    company: 'Figma',
    role: 'Software Engineer, Early Career',
    site: 'Greenhouse',
    estimateMin: 3,
    source: 'Extension',
    stage: 'waiting',
    agent: 'need',
    waitReason: 'Draft to review',
  },
  {
    id: 'brex',
    company: 'Brex',
    role: 'Software Engineer, New Grad',
    site: 'Greenhouse',
    estimateMin: 2,
    source: 'Pasted',
    stage: 'waiting',
    agent: 'block',
    waitReason: 'Human check',
  },
  {
    id: 'duolingo',
    company: 'Duolingo',
    role: 'Software Engineer, New Grad',
    site: 'Greenhouse',
    estimateMin: 2,
    source: 'Pasted',
    stage: 'queued',
    agent: 'idle',
  },
  {
    id: 'capital-one',
    company: 'Capital One',
    role: 'Associate Software Engineer',
    site: 'Workday',
    siteNote: 'creates a site account',
    estimateMin: 50,
    source: 'Pasted',
    stage: 'queued',
    agent: 'idle',
  },
  {
    id: 'cloudflare',
    company: 'Cloudflare',
    role: 'Software Engineer Intern → FT',
    site: 'Greenhouse',
    estimateMin: 2,
    source: 'Pasted',
    stage: 'queued',
    agent: 'idle',
  },
  {
    id: 'asana',
    company: 'Asana',
    role: 'Software Engineer, New Grad',
    site: 'Greenhouse',
    estimateMin: 2,
    source: 'Pasted',
    stage: 'queued',
    agent: 'idle',
  },
  {
    id: 'rippling',
    company: 'Rippling',
    role: 'Software Engineer I',
    site: 'Ashby',
    estimateMin: 2,
    source: 'Sheet',
    stage: 'held',
    agent: 'idle',
    heldAt: '10:42',
  },
];

/** A job the user can still change: running ones are locked (a worker already has them open). */
export const isEditable = (i: QueueItem): boolean => i.stage !== 'running';

/** Jobs that stay in the user's hands before they start: can be selected, held, removed. */
export const isReorderable = (i: QueueItem): boolean => i.stage === 'queued' || i.stage === 'held';

export interface RemovedBatch {
  entries: { item: QueueItem; index: number }[];
  /** Epoch ms when the removal happened; the undo window runs from here. */
  at: number;
}

export interface QueueState {
  items: QueueItem[];
  query: string;
  filter: QueueFilter;
  selected: string[];
  /** Row the keyboard acts on; its row shows the action buttons. */
  cursor: string | null;
  paused: boolean;
  removed: RemovedBatch | null;
}

export type QueueAction =
  | { type: 'loaded'; items: QueueItem[] }
  | { type: 'query'; query: string }
  | { type: 'filter'; filter: QueueFilter }
  | { type: 'toggle'; id: string }
  | { type: 'cursor'; id: string | null }
  | { type: 'step'; delta: 1 | -1 }
  | { type: 'clearSelection' }
  | { type: 'moveToTop'; ids: string[] }
  | { type: 'hold'; ids: string[]; at: string }
  | { type: 'remove'; ids: string[]; now: number }
  | { type: 'undoRemove' }
  | { type: 'expireUndo'; now: number }
  | { type: 'togglePause' }
  | { type: 'add'; items: QueueItem[] }
  | { type: 'reorder'; id: string; beforeId: string };

export function initialQueueState(items: QueueItem[] = SAMPLE_QUEUE): QueueState {
  return { items, query: '', filter: 'all', selected: [], cursor: null, paused: false, removed: null };
}

export function matchesQueueFilter(i: QueueItem, f: QueueFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'running':
    case 'waiting':
    case 'held':
      return i.stage === f;
    default:
      return i.source === f;
  }
}

export function matchesQueueQuery(i: QueueItem, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${i.company} ${i.role} ${i.site}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export const visibleQueue = (s: QueueState): QueueItem[] =>
  s.items.filter((i) => matchesQueueFilter(i, s.filter) && matchesQueueQuery(i, s.query));

export function queueFilterCounts(items: readonly QueueItem[]): Record<QueueFilter, number> {
  const out: Record<QueueFilter, number> = {
    all: 0,
    running: 0,
    waiting: 0,
    held: 0,
    Extension: 0,
    Pasted: 0,
    Sheet: 0,
  };
  for (const i of items) {
    out.all += 1;
    if (i.stage !== 'queued') out[i.stage] += 1;
    out[i.source] += 1;
  }
  return out;
}

/** 1-based position among queued jobs (running/waiting/held rows carry a label instead of a number). */
export function queuePosition(items: readonly QueueItem[], id: string): number | null {
  const queued = items.filter((i) => i.stage === 'queued');
  const at = queued.findIndex((i) => i.id === id);
  return at === -1 ? null : at + 1;
}

/** Crew time left: everything not held and not already finished, in minutes. */
export const minutesLeft = (items: readonly QueueItem[]): number =>
  items.filter((i) => i.stage !== 'held').reduce((sum, i) => sum + i.estimateMin, 0);

/** "~1 h 05 left" style, as the board's crew pill shows it. */
export function formatCrewTime(min: number): string {
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, '0');
  return `~${h} h ${m}`;
}

/** Only ids that exist and may be edited: protects bulk actions from stale selections and locked rows. */
function editableIds(s: QueueState, ids: string[]): Set<string> {
  const ok = new Set<string>();
  for (const i of s.items) if (ids.includes(i.id) && isEditable(i)) ok.add(i.id);
  return ok;
}

export function queueReducer(s: QueueState, a: QueueAction): QueueState {
  switch (a.type) {
    case 'loaded':
      return { ...s, items: a.items, selected: [], cursor: null, removed: null };
    case 'query':
      return { ...s, query: a.query };
    case 'filter':
      return { ...s, filter: a.filter };
    case 'toggle': {
      const item = s.items.find((i) => i.id === a.id);
      if (!item || !isEditable(item)) return s;
      return {
        ...s,
        selected: s.selected.includes(a.id) ? s.selected.filter((x) => x !== a.id) : [...s.selected, a.id],
      };
    }
    case 'cursor':
      return s.cursor === a.id ? s : { ...s, cursor: a.id };
    case 'step': {
      const rows = visibleQueue(s);
      if (rows.length === 0) return s;
      const at = rows.findIndex((i) => i.id === s.cursor);
      const next =
        at === -1 ? (a.delta === 1 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, at + a.delta));
      const id = (rows[next] as QueueItem).id;
      return id === s.cursor ? s : { ...s, cursor: id };
    }
    case 'clearSelection':
      return s.selected.length ? { ...s, selected: [] } : s;
    case 'moveToTop': {
      const ids = editableIds(s, a.ids);
      if (ids.size === 0) return s;
      // "Top" of what the user controls: right after the rows a worker (or the user's attention) already holds.
      const moved = s.items.filter((i) => ids.has(i.id) && isReorderable(i));
      if (moved.length === 0) return s;
      const rest = s.items.filter((i) => !moved.includes(i));
      const firstEditable = rest.findIndex(isReorderable);
      const at = firstEditable === -1 ? rest.length : firstEditable;
      const items = [
        ...rest.slice(0, at),
        ...moved.map((i) => ({ ...i, stage: 'queued' as const, heldAt: undefined })),
        ...rest.slice(at),
      ];
      return { ...s, items };
    }
    case 'hold': {
      const ids = editableIds(s, a.ids);
      if (ids.size === 0) return s;
      // Hold toggles: if every target is already held, release them back into the queue.
      const targets = s.items.filter((i) => ids.has(i.id) && isReorderable(i));
      if (targets.length === 0) return s;
      const release = targets.every((i) => i.stage === 'held');
      const items = s.items.map((i) =>
        ids.has(i.id) && isReorderable(i)
          ? release
            ? { ...i, stage: 'queued' as const, heldAt: undefined }
            : { ...i, stage: 'held' as const, heldAt: a.at }
          : i,
      );
      return { ...s, items };
    }
    case 'remove': {
      const ids = editableIds(s, a.ids);
      if (ids.size === 0) return s;
      const entries = s.items.flatMap((item, index) => (ids.has(item.id) ? [{ item, index }] : []));
      return {
        ...s,
        items: s.items.filter((i) => !ids.has(i.id)),
        selected: s.selected.filter((id) => !ids.has(id)),
        cursor: s.cursor && ids.has(s.cursor) ? null : s.cursor,
        removed: { entries, at: a.now },
      };
    }
    case 'undoRemove': {
      if (!s.removed) return s;
      const items = [...s.items];
      for (const { item, index } of s.removed.entries) items.splice(Math.min(index, items.length), 0, item);
      return { ...s, items, removed: null };
    }
    case 'expireUndo':
      return s.removed && a.now - s.removed.at >= UNDO_WINDOW_MS ? { ...s, removed: null } : s;
    case 'add': {
      const have = new Set(s.items.map((i) => i.id));
      const fresh = a.items.filter((i) => !have.has(i.id));
      return fresh.length ? { ...s, items: [...s.items, ...fresh] } : s;
    }
    case 'togglePause':
      return { ...s, paused: !s.paused };
    case 'reorder': {
      const from = s.items.find((i) => i.id === a.id);
      const before = s.items.find((i) => i.id === a.beforeId);
      if (!from || !before || from.id === before.id || !isReorderable(from) || !isReorderable(before)) return s;
      const rest = s.items.filter((i) => i.id !== from.id);
      const at = rest.findIndex((i) => i.id === before.id);
      return { ...s, items: [...rest.slice(0, at), from, ...rest.slice(at)] };
    }
  }
}

/** Dev-only fixtures that put the queue into the states the board draws (selection, undo toast). */
export type QueueScenario = 'bulk' | 'addjobs';

/** Coinbase was removed 3 s before the frozen clock, so the board's toast reads "5 s" and 62 %. */
const SCENARIO_NOW = 1_000_000;
export function scenarioQueue(name: QueueScenario): { state: QueueState; frozenNow: number } {
  const coinbase: QueueItem = {
    id: 'coinbase',
    company: 'Coinbase',
    role: 'Software Engineer, New Grad',
    site: 'Greenhouse',
    estimateMin: 2,
    source: 'Pasted',
    stage: 'queued',
    agent: 'idle',
  };
  if (name === 'addjobs') {
    // The Add jobs board sits over a five-job queue that holds none of the pasted companies.
    const five = SAMPLE_QUEUE.filter((i) => ['mercury', 'retool', 'figma', 'brex', 'rippling'].includes(i.id));
    return { state: initialQueueState(five), frozenNow: SCENARIO_NOW };
  }
  return {
    state: {
      ...initialQueueState(),
      cursor: 'cloudflare',
      selected: ['duolingo', 'asana'],
      removed: { entries: [{ item: coinbase, index: 4 }], at: SCENARIO_NOW - 3000 },
    },
    frozenNow: SCENARIO_NOW,
  };
}
