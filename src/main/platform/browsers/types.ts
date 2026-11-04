import type { BrowserId } from '../../../shared/dto';
import type { McpServerConfig } from '../agents/types';

export interface BrowserTab {
  tabId: string;
}

/** One field as the live form shows it. `hash` covers every field; a caller may cap the list it displays. */
export interface FormSnapshot {
  hash: string;
  fields: Array<{ label: string; value: string }>;
}

/**
 * The only way a submit click can reach a page: the owner approved a form with this hash. The provider re-reads the live
 * form right before the click and refuses on any difference, and calls `claim` (durable, at most once) just before it.
 */
export interface SubmitAuthorisation {
  formHash: string;
  /** Returns false when a submit click was already claimed for this approval; the click must then not happen. */
  claim(): boolean;
}

/** The one file a run may attach, chosen by main from the owner's stored CV; the agent never supplies a path. */
export interface UploadableFile {
  /** Absolute path of the copy made for this run. */
  path: string;
  fileName: string;
}

/** Where a run's tab is, for showing the owner which tab to look at. */
export interface TabLocation {
  tabId: string;
  /** Current address of the tab when the browser could be asked; absent when it could not. */
  url?: string;
}

/** One browser backend (neo, playwright, embedded). Each run gets its own tab. */
export interface BrowserProvider {
  readonly id: BrowserId;
  /** MCP server the agent uses to drive this browser. Final actions (submit, send, pay, delete) are refused unless `submit` is given, and then only submit-like ones. */
  mcpServerConfig(
    runId: string,
    signal: AbortSignal,
    submit?: SubmitAuthorisation,
    /** Adds `upload_cv`, which attaches exactly this file to a file input of the owned tab. No other path is uploadable. */
    upload?: UploadableFile,
  ): Promise<McpServerConfig>;
  openTab(runId: string, url: string): Promise<BrowserTab>;
  /** Idempotent: closing an already-closed run's tab is a no-op. */
  closeTab(runId: string): Promise<void>;
  /** One read of the owned tab: its form hash (the approval binds to it) and the field values it shows. Rejects when the tab is gone. */
  formSnapshot(runId: string): Promise<FormSnapshot>;
  /**
   * Owner take-over: while held, every browser tool call the agent makes for this run waits (it neither acts nor fails).
   * Optional: a provider without tab control omits these four. Returns false when the run has no open tab. The hold ends on `releaseTab` or when the tab closes.
   */
  holdTab?(runId: string): boolean;
  releaseTab?(runId: string): void;
  isHeld?(runId: string): boolean;
  /** The run's open tab, or null when there is none. Neo's MCP cannot switch the visible tab, so this names it instead. */
  tabLocation?(runId: string): Promise<TabLocation | null>;
}
