import { describe, expect, it } from 'vitest';
import { keyToResult, type KeyLike } from '../../src/renderer/src/features/dashboard/keys';
import { SAMPLE_APPLICATIONS } from '../../src/renderer/src/features/dashboard/sample';
import { dashboardReducer, initialState } from '../../src/renderer/src/features/dashboard/state';

const key = (k: string, mods: Partial<KeyLike> = {}): KeyLike => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});
const base = initialState(SAMPLE_APPLICATIONS);

describe('list keys', () => {
  it.each([
    ['j', { type: 'move', delta: 1 }],
    ['J', { type: 'move', delta: 1 }],
    ['ArrowDown', { type: 'move', delta: 1 }],
    ['k', { type: 'move', delta: -1 }],
    ['ArrowUp', { type: 'move', delta: -1 }],
    [' ', { type: 'togglePeek' }],
    ['s', { type: 'openStatus' }],
    ['Escape', { type: 'escape' }],
  ])('%s maps to its action and prevents default', (k, action) => {
    expect(keyToResult(key(k), base, false)).toEqual({ action, preventDefault: true });
  });
  it('O opens the posting and / focuses search, as effects', () => {
    expect(keyToResult(key('o'), base, false)).toEqual({ effect: 'openPosting', preventDefault: true });
    expect(keyToResult(key('/'), base, false)).toEqual({ effect: 'focusSearch', preventDefault: true });
  });
  it('ignores other keys and any modified key (the browser keeps ⌘R, ⌘V, …)', () => {
    expect(keyToResult(key('x'), base, false)).toBeNull();
    expect(keyToResult(key('j', { metaKey: true }), base, false)).toBeNull();
    expect(keyToResult(key('v', { metaKey: true }), base, false)).toBeNull();
  });
});

describe('typing in a text field', () => {
  it('lets J, K, S, O, Space and / through as text', () => {
    for (const k of ['j', 'k', 's', 'o', ' ', '/']) expect(keyToResult(key(k), base, true)).toBeNull();
  });
  it('Escape clears the query first, then backs out of the screen', () => {
    const withQuery = dashboardReducer(base, { type: 'query', query: 'ramp' });
    expect(keyToResult(key('Escape'), withQuery, true)).toMatchObject({
      action: { type: 'query', query: '' },
      effect: 'blurSearch',
    });
    expect(keyToResult(key('Escape'), base, true)).toMatchObject({ action: { type: 'escape' }, effect: 'blurSearch' });
  });
});

describe('status menu keys', () => {
  const menu = dashboardReducer(base, { type: 'openStatus', id: 'ramp' });
  it('arrows move, Enter confirms, Escape closes', () => {
    expect(keyToResult(key('ArrowDown'), menu, false)?.action).toEqual({ type: 'statusCursor', delta: 1 });
    expect(keyToResult(key('ArrowUp'), menu, false)?.action).toEqual({ type: 'statusCursor', delta: -1 });
    expect(keyToResult(key('Enter'), menu, false)?.effect).toBe('confirmStatus');
    expect(keyToResult(key('Escape'), menu, false)?.action).toEqual({ type: 'closeStatus' });
  });
  it('a status initial jumps to it; other letters are ignored', () => {
    expect(keyToResult(key('o'), menu, false)?.action).toEqual({ type: 'statusJump', letter: 'o' });
    expect(keyToResult(key('z'), menu, false)).toBeNull();
  });
});
