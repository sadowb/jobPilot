import type { DashboardAction, DashboardState } from './state';

export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** Things a key can ask for that are not state transitions (the component runs them). */
export type KeyEffect = 'focusSearch' | 'openPosting' | 'confirmStatus' | 'blurSearch';

export interface KeyResult {
  action?: DashboardAction;
  effect?: KeyEffect;
  preventDefault: boolean;
}

const handled = (r: Omit<KeyResult, 'preventDefault'>): KeyResult => ({ ...r, preventDefault: true });

/**
 * Maps a keydown to what the Dashboard does, from the V17 footer hints: J/K move, Space peek, S status,
 * O open posting, / search, Esc back out. ⌘V is left to the browser: its `paste` event opens Add jobs.
 * `typing` is true while a text field has focus:
 * then only Escape is ours, so the search box still receives J, K, S, O and Space as text.
 * Returns null when the key is not ours (the browser keeps its default).
 */
export function keyToResult(e: KeyLike, state: DashboardState, typing: boolean): KeyResult | null {
  const plain = !e.metaKey && !e.ctrlKey && !e.altKey;

  if (typing) {
    if (e.key !== 'Escape') return null;
    // First Esc empties the search text; the next one (field now empty) backs out of the screen.
    return handled({
      action: state.query !== '' ? { type: 'query', query: '' } : { type: 'escape' },
      effect: 'blurSearch',
    });
  }

  if (!plain) return null;

  if (state.cvOpen) {
    return e.key === 'Escape' ? handled({ action: { type: 'escape' } }) : null;
  }

  if (state.statusMenu) {
    if (e.key === 'ArrowDown') return handled({ action: { type: 'statusCursor', delta: 1 } });
    if (e.key === 'ArrowUp') return handled({ action: { type: 'statusCursor', delta: -1 } });
    if (e.key === 'Enter') return handled({ effect: 'confirmStatus' });
    if (e.key === 'Escape') return handled({ action: { type: 'closeStatus' } });
    return null;
  }

  switch (e.key) {
    case 'j':
    case 'J':
    case 'ArrowDown':
      return handled({ action: { type: 'move', delta: 1 } });
    case 'k':
    case 'K':
    case 'ArrowUp':
      return handled({ action: { type: 'move', delta: -1 } });
    case ' ':
      return handled({ action: { type: 'togglePeek' } });
    case 's':
    case 'S':
      return handled({ action: { type: 'openStatus' } });
    case 'o':
    case 'O':
      return handled({ effect: 'openPosting' });
    case '/':
      return handled({ effect: 'focusSearch' });
    case 'Escape':
      return handled({ action: { type: 'escape' } });
    default:
      return null;
  }
}
