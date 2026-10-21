import type { InboxView } from './state';

export type InboxCommand =
  'next' | 'prev' | 'takeOver' | 'handBack' | 'goToTab' | 'accept' | 'edit' | 'skip' | 'search' | 'escape';

export interface KeyInput {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

/**
 * Maps a keypress to an Inbox command for the current view (the footer on each board lists the live keys).
 * Returns null for anything not bound there, including any chord with ⌘/Ctrl/Alt (those belong to the shell).
 */
export function commandFor(e: KeyInput, view: InboxView): InboxCommand | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === '/') return 'search';
  if (k === 'Escape') return 'escape';
  if (view === 'clear') return null;
  if (k === 'g') return view === 'pilot' ? null : 'goToTab';
  if (view === 'pilot') return null;
  if (k === 'j') return 'next';
  if (k === 'k') return 'prev';
  if (view === 'takeover') return k === 'h' ? 'handBack' : null;
  if (k === 't') return 'takeOver';
  if (k === 'Enter') return 'accept';
  if (k === 'e') return 'edit';
  if (k === 's') return 'skip';
  return null;
}
