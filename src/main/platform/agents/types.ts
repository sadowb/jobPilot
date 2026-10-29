/** Contract between the runs module and agent backends (claude.ts, codex.ts, cli.ts). No backend-specific types leak out of here. */
import { z } from 'zod';
import type { AgentId } from '../../../shared/dto';
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk';

export type McpServerConfig =
  | McpSdkServerConfigWithInstance
  | { type: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
  | { type: 'http'; url: string; headers?: Record<string, string> };

/** What the agent must return, validated by the app before any state change. */
export const RunResultSchema = z.object({
  status: z.enum(['filled', 'needs_answers', 'blocked', 'submitted', 'failed']),
  /** Answers the agent took from the fill plan / library / profile. */
  answers_used: z.array(
    z.object({ field_key: z.string(), answer: z.string(), source: z.enum(['library', 'profile', 'agent', 'owner']) }),
  ),
  /** Answers the agent had to produce itself; the app offers them for the answer library. */
  answers_added: z.array(z.object({ field_key: z.string(), question: z.string(), answer: z.string() })),
  /** Fields the agent could not answer (status needs_answers). */
  questions_needed: z
    .array(z.object({ field_key: z.string(), question: z.string(), options: z.array(z.string()).optional() }))
    .default([]),
  /** Site/form quirks worth remembering (stored in Mnemosyne). */
  learned: z.array(z.string()),
  blockers: z.array(z.object({ kind: z.enum(['captcha', 'login', 'unsupported', 'other']), message: z.string() })),
  /** Deprecated / ignored: app computes formHash directly from the owned tab snapshot. */
  form_hash: z.string().optional(),
});
export type RunResult = z.infer<typeof RunResultSchema>;

export const RunEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session'), sessionId: z.string() }),
  z.object({ type: z.literal('message'), role: z.enum(['assistant', 'user']), text: z.string() }),
  z.object({ type: z.literal('tool_call'), callId: z.string(), name: z.string(), input: z.unknown() }),
  z.object({ type: z.literal('tool_result'), callId: z.string(), output: z.unknown(), isError: z.boolean() }),
  z.object({ type: z.literal('status'), text: z.string() }),
  z.object({
    type: z.literal('cost'),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    costMicros: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type RunEvent = z.infer<typeof RunEventSchema>;

export interface RunSpec<S extends z.ZodType = typeof RunResultSchema> {
  runId: string;
  prompt: string;
  /** MCP servers attached to the run (browser, memory). */
  mcpServers: Record<string, McpServerConfig>;
  /** Per-server tool allow-list (bare tool names); a server not listed here allows all its tools. */
  toolAllowlist?: Record<string, readonly string[]>;
  /** Final structured output the agent must produce; runs use RunResultSchema, other callers (posting reader) bring their own. */
  outputSchema: S;
  model?: string;
  /** Only the env the agent needs; never the app's full environment. */
  env?: Record<string, string>;
  /** Agent-side session id owned by the run row; first turn creates it, a resumed turn continues it. */
  sessionId: string;
  resume?: boolean;
  signal: AbortSignal;
  timeoutMs: number;
}

export interface AgentRun<T = RunResult> {
  /** Consume to completion (or abort); `result` settles after the stream ends. */
  events: AsyncIterable<RunEvent>;
  /** Rejects on timeout, abort, or output that fails `outputSchema`. */
  result: Promise<T>;
}

export interface AgentProvider {
  readonly id: AgentId;
  prepare?(): Promise<void>;
  run<S extends z.ZodType = typeof RunResultSchema>(spec: RunSpec<S>): AgentRun<z.infer<S>>;
}
