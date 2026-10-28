import type { MemoryStatus } from '../../../shared/dto';
import type { McpServerConfig } from '../agents/types';

/** The only Mnemosyne tools an agent run may call (export/import/media tools reach outside userData). */
export const MEMORY_TOOLS = ['mnemosyne_recall', 'mnemosyne_remember'] as const;

/** Memory tool lifecycle (same shape as the other on-demand tools, ADR 0015). */
export interface MemoryProvider {
  status(): MemoryStatus;
  /** Starts the owner-requested install and returns at once; poll `status()`. Idempotent while installing. */
  install(): MemoryStatus;
  /** Stops owned processes and deletes the tool and the memory data. */
  remove(): Promise<MemoryStatus>;
  /** MCP stdio config for a run; undefined unless ready, so runs work without memory. */
  mcpServerConfig(): McpServerConfig | undefined;
  /** One consolidation ("sleep") pass; no-op unless ready. */
  consolidate(signal: AbortSignal): Promise<void>;
  /** Abort installs and owned children (quit). */
  stop(): Promise<void>;
}
