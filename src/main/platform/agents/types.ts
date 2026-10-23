/** Contract between the runs module and agent backends (claude.ts, codex.ts, cli.ts). No backend-specific types leak out of here. */
import { z } from 'zod';
import type { AgentId } from '../../../shared/dto';

export type McpServerConfig =
  | { type: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
  | { type: 'http'; url: string; headers?: Record<string, string> };

/** What the agent must return, validated by the app before any state change. */
export const RunResultSchema = z.object({
  status: z.enum(['filled', 'needs_answers', 'blocked', 'submitted', 'failed']),
  /** Answers the agent took from the fill plan / library / profile. */
  answers_used: z.array(z.object({ field_key: z.string(), answer: z.string(), source: z.enum(['library', 'profile', 'agent', 'owner']) })),
  /** Answers the agent had to produce itself; the app offers them for the answer library. */
  answers_added: z.array(z.object({ field_key: z.string(), question: z.string(), answer: z.string() })),
  /** Fields the agent could not answer (status needs_answers). */
  questions_needed: z.array(z.object({ field_key: z.string(), question: z.string(), options: z.array(z.string()).optional() })).default([]),
  /** Site/form quirks worth remembering (stored in Mnemosyne). */
  learned: z.array(z.string()),
  blockers: z.array(z.object({ kind: z.enum(['captcha', 'login', 'unsupported', 'other']), message: z.string() })),
  /** Hash of the form as filled; the approval binds to it. */
  form_hash: z.string().min(1),
});
export type RunResult = z.infer<typeof RunResultSchema>;

export type RunEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'message'; role: 'assistant' | 'user'; text: string }
  | { type: 'tool_call'; callId: string; name: string; input: unknown }
  | { type: 'tool_result'; callId: string; output: unknown; isError: boolean }
  | { type: 'status'; text: string }
  | { type: 'cost'; inputTokens: number; outputTokens: number; costMicros: number }
  | { type: 'error'; message: string };

export interface RunSpec {
  runId: string;
  prompt: string;
  /** MCP servers attached to the run (browser, memory). */
  mcpServers: Record<string, McpServerConfig>;
  /** Final structured output the agent must produce. */
  outputSchema: typeof RunResultSchema;
  /** Agent-side session id to continue (resume after an Inbox answer). */
  resumeId?: string;
  model?: string;
  /** Only the env the agent needs; never the app's full environment. */
  env?: Record<string, string>;
  signal: AbortSignal;
  timeoutMs: number;
}

export interface AgentRun {
  /** Consume to completion (or abort); `result` settles after the stream ends. */
  events: AsyncIterable<RunEvent>;
  /** Rejects on timeout, abort, or output that fails RunResultSchema. */
  result: Promise<RunResult>;
}

export interface AgentProvider {
  readonly id: AgentId;
  run(spec: RunSpec): AgentRun;
}
