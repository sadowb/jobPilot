import { RunResultSchema, type AgentProvider, type RunSpec } from './types';

export class FakeAgentProvider implements AgentProvider {
  readonly id = 'claude';
  delayMs = 1000;
  readonly aborted = new Set<string>();
  readonly history: Array<{ runId: string; model?: string }> = [];
  private readonly pending = new Map<string, (result: unknown) => void>();

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

  run(spec: RunSpec) {
    this.history.push({ runId: spec.runId, model: spec.model });
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
      timer = setTimeout(() => this.complete(spec.runId), this.delayMs);
      if (signal.aborted) abort();
    })
      .then((value) => RunResultSchema.parse(value))
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
