import { describe, expect, it } from 'vitest';
import {
  canUndo,
  dashboardReducer,
  initialState,
  selectedApp,
  visibleApps,
  type DashboardAction,
} from '../../src/renderer/src/features/dashboard/state';
import { TEST_APPLICATIONS } from './fixtures';

const run = (actions: DashboardAction[]) => actions.reduce(dashboardReducer, initialState(TEST_APPLICATIONS));

describe('selection', () => {
  it('J from nothing selects the first row; K at the top stays put', () => {
    const s = run([{ type: 'move', delta: 1 }]);
    expect(s.selectedId).toBe(TEST_APPLICATIONS[0]!.id);
    expect(dashboardReducer(s, { type: 'move', delta: -1 }).selectedId).toBe(s.selectedId);
  });
  it('clamps at the last row', () => {
    const n = TEST_APPLICATIONS.length;
    const s = run(Array.from({ length: n + 3 }, () => ({ type: 'move', delta: 1 }) as const));
    expect(s.selectedId).toBe(TEST_APPLICATIONS[n - 1]!.id);
  });
  it('Space opens peek on the selection, or on the first row when nothing is selected, and closes it again', () => {
    const open = run([{ type: 'togglePeek' }]);
    expect(open.peekOpen).toBe(true);
    expect(open.selectedId).toBe(TEST_APPLICATIONS[0]!.id);
    expect(dashboardReducer(open, { type: 'togglePeek' }).peekOpen).toBe(false);
  });
});

describe('search and filter', () => {
  it('drops the selection when its row is filtered out and closes what hangs off it', () => {
    const s = run([
      { type: 'select', id: 'ramp', peek: true },
      { type: 'query', query: 'perpay' },
    ]);
    expect(s.selectedId).toBeNull();
    expect(s.peekOpen).toBe(false);
    expect(visibleApps(s).map((a) => a.id)).toEqual(['perpay']);
  });
  it('keeps the selection when it still matches', () => {
    const s = run([
      { type: 'select', id: 'ramp', peek: true },
      { type: 'query', query: 'ramp' },
    ]);
    expect(s.selectedId).toBe('ramp');
    expect(s.peekOpen).toBe(true);
  });
});

describe('status edits', () => {
  it('sets the status as "you" with today, and undo restores the previous values', () => {
    const before = TEST_APPLICATIONS.find((a) => a.id === 'datadog')!;
    const edited = run([
      { type: 'select', id: 'datadog' },
      { type: 'setStatus', status: 'interview', today: '2026-10-20' },
    ]);
    const app = edited.apps.find((a) => a.id === 'datadog')!;
    expect(app).toMatchObject({ status: 'interview', statusSource: 'you', statusSetOn: '2026-10-20' });
    expect(canUndo(edited)).toBe(true);
    const undone = dashboardReducer(edited, { type: 'undoStatus' });
    const back = undone.apps.find((a) => a.id === 'datadog')!;
    expect(back).toMatchObject({
      status: before.status,
      statusSource: before.statusSource,
      statusSetOn: before.statusSetOn,
    });
  });
  it('setting the same status is a no-op for the data', () => {
    const before = TEST_APPLICATIONS.find((a) => a.id === 'datadog')!;
    const s = run([
      { type: 'select', id: 'datadog' },
      { type: 'setStatus', status: before.status, today: '2026-10-20' },
    ]);
    expect(s.apps).toBe(initialState(TEST_APPLICATIONS).apps);
  });
  it('undoes an inbox-inferred status back to the agent value', () => {
    const s = run([{ type: 'select', id: 'ramp' }]);
    expect(selectedApp(s)!.statusSource).toBe('email');
    const undone = dashboardReducer(s, { type: 'undoStatus' });
    expect(undone.apps.find((a) => a.id === 'ramp')).toMatchObject({ status: 'submitted', statusSource: 'agent' });
  });
  it('status menu cursor wraps', () => {
    const open = run([{ type: 'openStatus', id: 'ramp' }]);
    expect(open.statusMenu).not.toBeNull();
    const up = dashboardReducer(open, { type: 'statusCursor', delta: -1 });
    expect(up.statusMenu!.cursor).not.toBe(open.statusMenu!.cursor);
  });
});

describe('escape', () => {
  it('backs out one layer at a time: cv, status menu, peek, query, selection', () => {
    let s = run([{ type: 'select', id: 'ramp', peek: true }, { type: 'openStatus' }]);
    expect(s.statusMenu).not.toBeNull();
    s = dashboardReducer(s, { type: 'escape' });
    expect(s.statusMenu).toBeNull();
    expect(s.peekOpen).toBe(true);
    s = dashboardReducer(s, { type: 'escape' });
    expect(s.peekOpen).toBe(false);
    expect(s.selectedId).toBe('ramp');
    s = dashboardReducer(s, { type: 'escape' });
    expect(s.selectedId).toBeNull();
  });
});
