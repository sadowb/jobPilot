import { z } from 'zod';
import { AgentToolId, BrowserId } from './enums';

/**
 * Local, read-only detection result. `ready` = found; whether the CLI is signed in is only known after the
 * test call (ADR 0016: detect with `--version` only).
 */
export const AgentToolSchema = z.object({
  id: AgentToolId.schema,
  name: z.string().max(80),
  state: z.enum(['found', 'not_installed']),
  version: z.string().max(256).nullable(),
  /** Resolved absolute path (always shown for Custom, which runs exactly this file). */
  path: z.string().max(4096).nullable(),
  /** Models the agent itself reports. Empty = use the agent's own default. */
  models: z.array(z.object({ value: z.string().max(128), label: z.string().max(128) })).max(50),
  defaultModel: z.string().max(128).nullable(),
  /** False while no run backend exists for this agent; it can be detected but not allowed. */
  runnable: z.boolean(),
});
export type AgentTool = z.infer<typeof AgentToolSchema>;

export const BrowserToolSchema = z.object({
  id: BrowserId.schema,
  name: z.string().max(80),
  state: z.enum(['running', 'not_running', 'not_installed']),
});
export type BrowserTool = z.infer<typeof BrowserToolSchema>;

export const PreflightSchema = z.object({
  agents: z.array(AgentToolSchema).max(8),
  browsers: z.array(BrowserToolSchema).max(16),
});
export type Preflight = z.infer<typeof PreflightSchema>;
