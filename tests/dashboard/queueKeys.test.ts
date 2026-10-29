import { describe, expect, it } from 'vitest';
import { initialQueueState, queueReducer } from '../../src/renderer/src/features/dashboard/upnext/queue';
import {
  actionTargets,
  queueKeyToResult,
  type QueueKeyEvent,
} from '../../src/renderer/src/features/dashboard/upnext/queueKeys';

const ev = (key: string, mods: Partial<QueueKeyEvent> = {}): QueueKeyEvent => ({
  key,
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...mods,
});
const s0 = initialQueueState();

describe('queue keys', () => {
  it('J/K and arrows step the cursor', () => {
    expect(queueKeyToResult(ev('j'), s0, false)?.action).toEqual({ type: 'step', delta: 1 });
    expect(queueKeyToResult(ev('ArrowUp'), s0, false)?.action).toEqual({ type: 'step', delta: -1 });
  });
  it('Shift+ArrowUp moves to top (not a cursor step)', () => {
    expect(queueKeyToResult(ev('ArrowUp', { shiftKey: true }), s0, false)).toEqual({
      moveToTop: true,
      preventDefault: true,
    });
  });
  it('H holds, Backspace and Delete remove, ⌘Z undoes, P pauses', () => {
    expect(queueKeyToResult(ev('h'), s0, false)?.hold).toBe(true);
    expect(queueKeyToResult(ev('Backspace'), s0, false)?.remove).toBe(true);
    expect(queueKeyToResult(ev('Delete'), s0, false)?.remove).toBe(true);
    expect(queueKeyToResult(ev('z', { metaKey: true }), s0, false)?.undo).toBe(true);
    expect(queueKeyToResult(ev('p'), s0, false)?.action).toEqual({ type: 'togglePause' });
  });
  it('Space toggles the cursor row, and does nothing without one', () => {
    expect(queueKeyToResult(ev(' '), s0, false)).toBeNull();
    const withCursor = queueReducer(s0, { type: 'cursor', id: 'asana' });
    expect(queueKeyToResult(ev(' '), withCursor, false)?.action).toEqual({ type: 'toggle', id: 'asana' });
  });
  it('Escape clears the selection first, then is not ours', () => {
    const picked = queueReducer(s0, { type: 'toggle', id: 'asana' });
    expect(queueKeyToResult(ev('Escape'), picked, false)?.action).toEqual({ type: 'clearSelection' });
    expect(queueKeyToResult(ev('Escape'), s0, false)).toBeNull();
  });
  it('⌘V is left to the browser paste event', () => {
    expect(queueKeyToResult(ev('v', { metaKey: true }), s0, false)).toBeNull();
  });
  it('while typing only Escape (blur) is handled', () => {
    expect(queueKeyToResult(ev('j'), s0, true)).toBeNull();
    expect(queueKeyToResult(ev('Escape'), s0, true)?.effect).toBe('blurSearch');
    const typed = queueReducer(s0, { type: 'query', query: 'x' });
    expect(queueKeyToResult(ev('Escape'), typed, true)).toMatchObject({ action: { type: 'query', query: '' } });
    expect(queueKeyToResult(ev('Escape'), typed, true)?.effect).toBeUndefined();
  });
  it('bulk keys act on the selection, else on the cursor row', () => {
    expect(actionTargets(s0)).toEqual([]);
    const cursor = queueReducer(s0, { type: 'cursor', id: 'asana' });
    expect(actionTargets(cursor)).toEqual(['asana']);
    const both = queueReducer(cursor, { type: 'toggle', id: 'duolingo' });
    expect(actionTargets(both)).toEqual(['duolingo']);
  });
});
