import type { BrowserId } from '../../../shared/dto';
import type { McpServerConfig } from '../agents/types';

export interface BrowserTab {
  tabId: string;
}

/** One browser backend (neo, playwright, embedded). Each run gets its own tab. */
export interface BrowserProvider {
  readonly id: BrowserId;
  /** MCP server the agent uses to drive this browser. */
  mcpServerConfig(runId: string, signal: AbortSignal): Promise<McpServerConfig>;
  openTab(runId: string, url: string): Promise<BrowserTab>;
  /** Idempotent: closing an already-closed run's tab is a no-op. */
  closeTab(runId: string): Promise<void>;
  /** Form hash computed directly from the owned tab snapshot for approval binding. */
  formHash(runId: string): Promise<string>;
}
