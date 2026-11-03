import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { AgentProvider } from '../../platform/agents/types';

/**
 * One tool-less, ephemeral agent call that must answer with `schema` (no MCP servers, so the agent cannot browse or
 * act). It goes through the gated provider, so `run` needs the owner's agent grant like any run. `prepare` is skipped on
 * purpose: the gate's version also demands the browser grant, which a tool-less call does not use (and the connection test
 * runs before the browser is allowed).
 */
export async function structuredCall<S extends z.ZodType>(
  agent: AgentProvider,
  schema: S,
  prompt: string,
  options: { timeoutMs: number; signal?: AbortSignal },
): Promise<z.infer<S>> {
  const run = agent.run({
    runId: randomUUID(),
    sessionId: randomUUID(),
    prompt,
    mcpServers: {},
    outputSchema: schema,
    ephemeral: true,
    signal: options.signal ?? new AbortController().signal,
    timeoutMs: options.timeoutMs,
  });
  const drain = (async () => {
    for await (const event of run.events) void event;
  })();
  void drain.catch(() => undefined);
  const [result] = await Promise.all([run.result, drain]);
  return result;
}
