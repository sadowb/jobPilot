import type { ReactNode } from 'react';
import type { StepRow } from './model';

export type ThreadMessage =
  | { kind: 'day'; label: string }
  | { kind: 'steps'; title: string; rows: readonly StepRow[] }
  | {
      kind: 'bubble';
      text: string;
      mine?: boolean;
      /** An owner message main has not confirmed (`sending`) or could not save (`failed`, with a retry). */
      status?: 'sending' | 'failed';
      onRetry?: () => void;
      error?: string;
      /** The reply is still being written. */
      streaming?: boolean;
      /** With `streaming`: the chat whose live reply text this bubble shows (it reads it itself, so the thread does not re-render per token). */
      liveKey?: string;
    }
  /** The agent has received the message and has not written anything yet. */
  | { kind: 'typing' }
  /** Something the pilot did beside answering, e.g. passed a note on. */
  | { kind: 'note'; text: string; onUndo?: () => void }
  /** An interactive widget card owned by the page. */
  | { kind: 'widget'; node: ReactNode };
