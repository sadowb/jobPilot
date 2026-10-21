import { createContext, useContext, type ReactNode } from 'react';

/**
 * SEAM: where the in-app browser view attaches.
 *
 * The take-over panel (LiveTabPanel) shows "the job's tab". Today that is a static sample drawn from the
 * V17_TakeOver board. When the embedded browser lands, mount a `LiveTabViewContext.Provider` above the
 * Inbox page whose `render` returns the live view (e.g. an Electron WebContentsView host element sized to
 * the slot) and keeps a single input owner: the human while `driving`, the agent otherwise.
 *
 * The Inbox feature never imports Electron or a browser engine; this interface is the whole contract.
 */
export interface LiveTabViewProps {
  itemId: string;
  /** Posting / form URL of the tab. */
  url: string;
  /** True while the owner has control (the agent is paused and must not type). */
  driving: boolean;
}

export interface LiveTabViewSlot {
  /** Return `null` to fall back to the built-in sample snapshot. */
  render: (props: LiveTabViewProps) => ReactNode | null;
}

export const LiveTabViewContext = createContext<LiveTabViewSlot>({ render: () => null });

export const useLiveTabView = (): LiveTabViewSlot => useContext(LiveTabViewContext);
