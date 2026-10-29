import { describe, expect, it } from 'vitest';
import {
  formatCrewTime,
  initialQueueState,
  minutesLeft,
  queueFilterCounts,
  queuePosition,
  queueReducer,
  SAMPLE_QUEUE,
  UNDO_WINDOW_MS,
  visibleQueue,
  type QueueAction,
  type QueueState,
} from '../../src/renderer/src/features/dashboard/upnext/queue';

const run = (actions: QueueAction[], from: QueueState = initialQueueState()) => actions.reduce(queueReducer, from);
const ids = (s: QueueState) => s.items.map((i) => i.id);

describe('sample queue and derived numbers', () => {
  it('matches the board: 9 jobs, 2 running, 2 waiting, 1 held, 65 minutes of crew time', () => {
    const c = queueFilterCounts(SAMPLE_QUEUE);
    expect(c).toMatchObject({ all: 9, running: 2, waiting: 2, held: 1, Extension: 2, Pasted: 6, Sheet: 1 });
    expect(minutesLeft(SAMPLE_QUEUE)).toBe(65);
  });
  it('formats crew time under and over an hour', () => {
    expect(formatCrewTime(56)).toBe('~56 min');
    expect(formatCrewTime(65)).toBe('~1 h 05');
    expect(formatCrewTime(120)).toBe('~2 h 00');
  });
  it('numbers only queued rows', () => {
    expect(queuePosition(SAMPLE_QUEUE, 'duolingo')).toBe(1);
    expect(queuePosition(SAMPLE_QUEUE, 'asana')).toBe(4);
    expect(queuePosition(SAMPLE_QUEUE, 'mercury')).toBeNull();
    expect(queuePosition(SAMPLE_QUEUE, 'rippling')).toBeNull();
  });
});

describe('search and chips', () => {
  it('searches company, role and site with AND across tokens', () => {
    expect(visibleQueue(run([{ type: 'query', query: 'workday' }])).map((i) => i.id)).toEqual(['capital-one']);
    expect(visibleQueue(run([{ type: 'query', query: 'ashby new' }])).map((i) => i.id)).toEqual(['mercury']);
  });
  it('filters by stage and by source', () => {
    expect(visibleQueue(run([{ type: 'filter', filter: 'waiting' }])).map((i) => i.id)).toEqual(['figma', 'brex']);
    expect(visibleQueue(run([{ type: 'filter', filter: 'Sheet' }])).map((i) => i.id)).toEqual(['rippling']);
  });
});

describe('cursor and selection', () => {
  it('steps through visible rows and clamps', () => {
    let s = run([{ type: 'step', delta: 1 }]);
    expect(s.cursor).toBe('mercury');
    s = run([{ type: 'step', delta: -1 }], initialQueueState());
    expect(s.cursor).toBe('rippling');
    s = run(Array.from({ length: 20 }, () => ({ type: 'step', delta: 1 }) as const));
    expect(s.cursor).toBe('rippling');
  });
  it('cannot select a running (locked) job', () => {
    expect(run([{ type: 'toggle', id: 'mercury' }]).selected).toEqual([]);
    expect(
      run([
        { type: 'toggle', id: 'duolingo' },
        { type: 'toggle', id: 'duolingo' },
      ]).selected,
    ).toEqual([]);
  });
});

describe('bulk actions', () => {
  it('moves selected queued jobs to the top of the editable region, keeping running and waiting rows first', () => {
    const s = run([{ type: 'moveToTop', ids: ['asana', 'cloudflare'] }]);
    expect(ids(s).slice(0, 4)).toEqual(['mercury', 'retool', 'figma', 'brex']);
    expect(ids(s).slice(4, 6)).toEqual(['cloudflare', 'asana']);
  });
  it('ignores locked rows in bulk actions', () => {
    const s = run([{ type: 'remove', ids: ['mercury'], now: 0 }]);
    expect(s.items).toBe(SAMPLE_QUEUE);
    expect(s.removed).toBeNull();
  });
  it('holds queued jobs, and a second hold on all-held targets releases them', () => {
    const held = run([{ type: 'hold', ids: ['duolingo'], at: '09:30' }]);
    expect(held.items.find((i) => i.id === 'duolingo')).toMatchObject({ stage: 'held', heldAt: '09:30' });
    const released = queueReducer(held, { type: 'hold', ids: ['duolingo'], at: '09:31' });
    expect(released.items.find((i) => i.id === 'duolingo')).toMatchObject({ stage: 'queued', heldAt: undefined });
  });
  it('removes jobs, drops them from the selection and clears a cursor on them', () => {
    const s = run([
      { type: 'cursor', id: 'asana' },
      { type: 'toggle', id: 'asana' },
      { type: 'remove', ids: ['asana'], now: 5 },
    ]);
    expect(ids(s)).not.toContain('asana');
    expect(s.selected).toEqual([]);
    expect(s.cursor).toBeNull();
    expect(s.removed?.at).toBe(5);
  });
});

describe('undo', () => {
  it('restores removed jobs at their original positions', () => {
    const removed = run([{ type: 'remove', ids: ['duolingo', 'asana'], now: 0 }]);
    const back = queueReducer(removed, { type: 'undoRemove' });
    expect(ids(back)).toEqual(ids(initialQueueState()));
    expect(back.removed).toBeNull();
  });
  it('expires only after the undo window', () => {
    const removed = run([{ type: 'remove', ids: ['asana'], now: 1000 }]);
    expect(queueReducer(removed, { type: 'expireUndo', now: 1000 + UNDO_WINDOW_MS - 1 }).removed).not.toBeNull();
    expect(queueReducer(removed, { type: 'expireUndo', now: 1000 + UNDO_WINDOW_MS }).removed).toBeNull();
  });
  it('a second removal replaces the first undo batch', () => {
    const s = run([
      { type: 'remove', ids: ['asana'], now: 0 },
      { type: 'remove', ids: ['duolingo'], now: 10 },
    ]);
    expect(s.removed?.entries.map((e) => e.item.id)).toEqual(['duolingo']);
  });
});

describe('reorder, pause, add', () => {
  it('drags a queued job before another queued job, never past locked rows', () => {
    const s = run([{ type: 'reorder', id: 'asana', beforeId: 'duolingo' }]);
    expect(ids(s).slice(4, 6)).toEqual(['asana', 'duolingo']);
    expect(run([{ type: 'reorder', id: 'asana', beforeId: 'mercury' }]).items).toBe(SAMPLE_QUEUE);
  });
  it('appends new jobs and skips ids already present', () => {
    const item = { ...SAMPLE_QUEUE[4]!, id: 'new-1', company: 'Coinbase' };
    const s = run([
      { type: 'add', items: [item] },
      { type: 'add', items: [item, SAMPLE_QUEUE[0]!] },
    ]);
    expect(ids(s).filter((i) => i === 'new-1')).toHaveLength(1);
    expect(s.items).toHaveLength(SAMPLE_QUEUE.length + 1);
    expect(s.items.at(-1)?.id).toBe('new-1');
  });
});
