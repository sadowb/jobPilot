import { describe, expect, it } from 'vitest';
import { commandFor } from '../src/renderer/src/features/inbox/hotkeys';
import { baseThread } from '../src/renderer/src/features/inbox/model';
import {
  countWords,
  inboxReducer,
  initialInboxState,
  pendingItems,
  threadMessages,
  viewOf,
  type InboxAction,
  type InboxState,
} from '../src/renderer/src/features/inbox/state';

const run = (actions: InboxAction[], from: InboxState = initialInboxState) => actions.reduce(inboxReducer, from);

describe('inbox reducer', () => {
  it('starts on the Figma review with 3 pending', () => {
    expect(viewOf(initialInboxState)).toBe('review');
    expect(pendingItems(initialInboxState).map((i) => i.id)).toEqual(['figma', 'brex', 'notion']);
  });

  it('selecting Cap shows the pilot view; resolved items cannot be selected', () => {
    expect(viewOf(run([{ type: 'select', id: 'cap' }]))).toBe('pilot');
    const s = run([{ type: 'resolve', id: 'brex' }]);
    expect(inboxReducer(s, { type: 'select', id: 'brex' })).toBe(s);
  });

  it('resolving the selected item moves to the next pending one, then to all-clear', () => {
    let s = run([{ type: 'resolve', id: 'figma' }]);
    expect(s.selected).toBe('brex');
    s = run([{ type: 'resolve', id: 'brex' }], s);
    expect(s.selected).toBe('notion');
    s = run([{ type: 'resolve', id: 'notion' }], s);
    expect(s.selected).toBeNull();
    expect(viewOf(s)).toBe('clear');
    expect(pendingItems(s)).toHaveLength(0);
  });

  it('resolving a non-selected item keeps the selection', () => {
    const s = run([{ type: 'resolve', id: 'notion' }]);
    expect(s.selected).toBe('figma');
  });

  it('resolve is idempotent', () => {
    const once = run([{ type: 'resolve', id: 'figma' }]);
    expect(inboxReducer(once, { type: 'resolve', id: 'figma' })).toBe(once);
  });

  it('take over / hand back: one driver at a time, hand back resolves the item', () => {
    let s = run([
      { type: 'select', id: 'brex' },
      { type: 'takeOver', id: 'brex' },
    ]);
    expect(viewOf(s)).toBe('takeover');
    expect(s.takeover).toBe('brex');
    // a second take over is refused while one is active
    expect(inboxReducer(s, { type: 'takeOver', id: 'figma' })).toBe(s);
    s = inboxReducer(s, { type: 'handBack', id: 'brex' });
    expect(s.takeover).toBeNull();
    expect(s.resolved).toContain('brex');
    expect(s.selected).toBe('notion');
  });

  it('driving another thread leaves the takeover running but changes the view', () => {
    const s = run([
      { type: 'takeOver', id: 'brex' },
      { type: 'select', id: 'figma' },
    ]);
    expect(s.takeover).toBe('brex');
    expect(viewOf(s)).toBe('review');
  });

  it('J/K steps through pending items and wraps', () => {
    let s = run([{ type: 'move', dir: 1 }]);
    expect(s.selected).toBe('brex');
    s = run(
      [
        { type: 'move', dir: 1 },
        { type: 'move', dir: 1 },
      ],
      s,
    );
    expect(s.selected).toBe('figma');
    expect(run([{ type: 'move', dir: -1 }]).selected).toBe('notion');
  });

  it('moving from the Cap thread enters the list at the first item', () => {
    expect(
      run([
        { type: 'select', id: 'cap' },
        { type: 'move', dir: 1 },
      ]).selected,
    ).toBe('figma');
  });

  it('move does nothing when nothing is pending', () => {
    const s = run([
      { type: 'resolve', id: 'figma' },
      { type: 'resolve', id: 'brex' },
      { type: 'resolve', id: 'notion' },
    ]);
    expect(inboxReducer(s, { type: 'move', dir: 1 })).toBe(s);
  });

  it('send appends a trimmed user bubble and ignores blank text', () => {
    let s = run([{ type: 'send', id: 'cap', text: '   ' }]);
    expect(s.sent).toEqual({});
    s = run([{ type: 'send', id: 'cap', text: '  hello  ' }]);
    const last = threadMessages(s, 'cap').at(-1);
    expect(last).toEqual({ kind: 'bubble', side: 'u', text: 'hello' });
  });

  it('the takeover script only appears while driving', () => {
    expect(baseThread('brex', false).some((m) => m.kind === 'event')).toBe(false);
    expect(baseThread('brex', true).some((m) => m.kind === 'event')).toBe(true);
  });
});

describe('countWords', () => {
  it('counts whitespace-separated runs', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  one   two\nthree ')).toBe(3);
  });
});

describe('inbox hotkeys', () => {
  const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {}) => ({
    key: k,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...mods,
  });

  it('review keys', () => {
    expect(commandFor(key('Enter'), 'review')).toBe('accept');
    expect(commandFor(key('e'), 'review')).toBe('edit');
    expect(commandFor(key('S'), 'review')).toBe('skip');
    expect(commandFor(key('t'), 'review')).toBe('takeOver');
    expect(commandFor(key('j'), 'review')).toBe('next');
    expect(commandFor(key('k'), 'review')).toBe('prev');
  });

  it('H only hands back while driving; T is off then', () => {
    expect(commandFor(key('h'), 'takeover')).toBe('handBack');
    expect(commandFor(key('h'), 'review')).toBeNull();
    expect(commandFor(key('t'), 'takeover')).toBeNull();
    expect(commandFor(key('Enter'), 'takeover')).toBeNull();
  });

  it('never claims chords, so ⌘K and ⌘V stay with the shell', () => {
    expect(commandFor(key('k', { metaKey: true }), 'review')).toBeNull();
    expect(commandFor(key('s', { ctrlKey: true }), 'review')).toBeNull();
  });

  it('pilot and clear views keep only the global keys', () => {
    expect(commandFor(key('t'), 'pilot')).toBeNull();
    expect(commandFor(key('j'), 'clear')).toBeNull();
    expect(commandFor(key('/'), 'clear')).toBe('search');
    expect(commandFor(key('Escape'), 'pilot')).toBe('escape');
  });
});
