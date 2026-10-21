import type { QueueAction, QueueState } from './queue';

export type QueueEffect = 'focusSearch' | 'blurSearch';

export interface QueueKeyResult {
  action?: QueueAction;
  effect?: QueueEffect;
  /** Remove the cursor row (or the selection) — needs the clock, so the view resolves it. */
  remove?: boolean;
  hold?: boolean;
  moveToTop?: boolean;
  undo?: boolean;
  preventDefault: boolean;
}

export interface QueueKeyEvent {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

/**
 * Pure key → intent mapper for Up next. J/K or ↑/↓ move the cursor, Space selects it, ⇧↑ moves to top,
 * H holds, ⌫ removes, ⌘Z undoes, P pauses, / searches, Esc backs out (selection first).
 * Typing in the search box only reacts to Escape.
 */
export function queueKeyToResult(e: QueueKeyEvent, s: QueueState, inText: boolean): QueueKeyResult | null {
  const mod = e.metaKey || e.ctrlKey;
  if (inText) return e.key === 'Escape' ? { effect: 'blurSearch', preventDefault: true } : null;
  if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) return { undo: true, preventDefault: true };
  if (mod || e.altKey) return null;
  const k = e.key;
  if (e.shiftKey && k === 'ArrowUp') return { moveToTop: true, preventDefault: true };
  switch (k) {
    case 'j':
    case 'ArrowDown':
      return { action: { type: 'step', delta: 1 }, preventDefault: true };
    case 'k':
    case 'ArrowUp':
      return { action: { type: 'step', delta: -1 }, preventDefault: true };
    case ' ':
      return s.cursor ? { action: { type: 'toggle', id: s.cursor }, preventDefault: true } : null;
    case 'h':
      return { hold: true, preventDefault: true };
    case 'Backspace':
    case 'Delete':
      return { remove: true, preventDefault: true };
    case 'p':
      return { action: { type: 'togglePause' }, preventDefault: true };
    case '/':
      return { effect: 'focusSearch', preventDefault: true };
    case 'Escape':
      if (s.selected.length) return { action: { type: 'clearSelection' }, preventDefault: true };
      return null;
    default:
      return null;
  }
}

/** Which rows a bulk shortcut targets: the selection when there is one, else the cursor row. */
export function actionTargets(s: QueueState): string[] {
  if (s.selected.length) return s.selected;
  return s.cursor ? [s.cursor] : [];
}
