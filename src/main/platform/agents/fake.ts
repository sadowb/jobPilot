import type { FakeMemoryProvider } from '../memory/fake';
import type { z } from 'zod';
import type { AgentState } from '../../../shared/dto';
import type { AgentModel } from './models';
import type { AgentProvider, AgentRun, RunResultSchema, RunSpec } from './types';

export class FakeAgentProvider implements AgentProvider {
  readonly id = 'claude';
  delayMs = 1000;
  readonly aborted = new Set<string>();
  readonly history: Array<{
    runId: string;
    model?: string;
    prompt: string;
    mcpServers: string[];
    toolAllowlist?: Record<string, readonly string[]>;
    recalled: string[];
  }> = [];
  private readonly pending = new Map<string, (result: unknown) => void>();

  /** Default answer for a run whose schema is not RunResultSchema (the posting reader); tests and E2E set it. */
  reply?: (spec: RunSpec<z.ZodType>) => unknown;

  /** `memory` emulates the agent obeying the prompt's recall/remember instructions (no model runs in E2E). */
  constructor(private readonly memory?: FakeMemoryProvider) {}

  complete(
    runId: string,
    result: unknown = {
      status: 'filled',
      answers_used: [],
      answers_added: [],
      learned: [],
      blockers: [],
      form_hash: `fake-${runId}`,
    },
  ): void {
    this.pending.get(runId)?.(result);
  }

  /**
   * The scripted reply, except for a tool-less call (connection test) it does not fit: that gets a plain
   * acknowledgement, so specs that script posting-reader replies need not know about the owner's connection test.
   */
  private answer(spec: RunSpec<z.ZodType>): unknown {
    const scripted = this.reply?.(spec);
    const toolless = Object.keys(spec.mcpServers).length === 0;
    return toolless && !spec.outputSchema.safeParse(scripted).success ? { ok: true } : scripted;
  }

  run<S extends z.ZodType = typeof RunResultSchema>(spec: RunSpec<S>): AgentRun<z.infer<S>> {
    const host = /"url":"https?:\/\/([^/"]+)/.exec(spec.prompt)?.[1] ?? '';
    const attached = 'memory' in spec.mcpServers && this.memory !== undefined;
    // Tool-less calls (connection test, CV and Cap turns) are not runs; `history` is the run log specs assert on.
    if (Object.keys(spec.mcpServers).length > 0)
      this.history.push({
        runId: spec.runId,
        model: spec.model,
        prompt: spec.prompt,
        mcpServers: Object.keys(spec.mcpServers),
        toolAllowlist: spec.toolAllowlist,
        recalled: attached ? this.memory!.recall(host) : [],
      });
    const signal = AbortSignal.any([spec.signal, AbortSignal.timeout(spec.timeoutMs)]);
    let timer: NodeJS.Timeout;
    let rejectRun: (error: Error) => void;
    const abort = () => {
      this.aborted.add(spec.runId);
      rejectRun(new Error('Fake run aborted'));
    };
    const result = new Promise<unknown>((resolve, reject) => {
      rejectRun = reject;
      this.pending.set(spec.runId, resolve);
      signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => this.complete(spec.runId, this.answer(spec)), this.delayMs);
      if (signal.aborted) abort();
    })
      .then((value) => spec.outputSchema.parse(value) as z.infer<S>)
      .then((value) => {
        const learned = (value as { learned?: unknown }).learned;
        if (attached && Array.isArray(learned))
          for (const lesson of learned) this.memory!.remember(`${host}: ${lesson}`);
        return value;
      })
      .finally(() => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        this.pending.delete(spec.runId);
      });
    async function* events() {
      yield { type: 'session' as const, sessionId: `session-${spec.runId}` };
      yield { type: 'status' as const, text: 'Fake provider started' };
    }
    return { events: events(), result };
  }
}

/** What setup asks of "Claude" in fake-provider E2E runs: always installed, ready, with two listed models. */
export const fakeClaudeControl = {
  state: async (): Promise<AgentState> => ({
    tool: 'claude',
    status: 'ready',
    login: 'ok',
    path: '/fake/claude',
    version: '0.0.0 (Claude Code)',
    confirmed: true,
    model: 'haiku',
    auth: 'login',
  }),
  models: async (): Promise<AgentModel[]> => [
    { value: 'haiku', label: 'Haiku' },
    { value: 'sonnet', label: 'Sonnet' },
  ],
  save: async (): Promise<AgentState> => fakeClaudeControl.state(),
  detect: async (): Promise<AgentState> => fakeClaudeControl.state(),
  chooseCandidate: async (): Promise<AgentState> => fakeClaudeControl.state(),
};
