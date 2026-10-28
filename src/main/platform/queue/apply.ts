import PQueue from 'p-queue';

/**
 * In-memory apply queue (ADR 0017). The run table is authoritative: RunsService re-enqueues `queued` rows at startup,
 * so nothing here is persisted and a crashed `running` run is failed, never silently re-run.
 */
export class ApplyWorker {
  private readonly queue: PQueue;
  /** Queued or running runs; one AbortController each, also the dedupe key. */
  private readonly active = new Map<string, AbortController>();
  private readonly running = new Set<Promise<void>>();

  constructor(
    concurrency: number,
    private readonly execute: (runId: string, signal: AbortSignal) => Promise<void>,
    private readonly closeTab: (runId: string) => Promise<void>,
    private readonly onError: (error: unknown, runId?: string) => void,
  ) {
    this.queue = new PQueue({ concurrency, autoStart: false });
  }

  async enqueue(runId: string): Promise<void> {
    if (this.active.has(runId)) return;
    const controller = new AbortController();
    this.active.set(runId, controller);
    void this.queue
      .add(async () => {
        if (controller.signal.aborted) return;
        const run = this.execute(runId, controller.signal).catch((error: unknown) => this.onError(error, runId));
        this.running.add(run);
        await run;
        this.running.delete(run);
      })
      .catch(() => undefined) // clear() on stop rejects queued tasks; execute errors are reported above
      .finally(() => this.active.delete(runId));
  }

  pause(): boolean {
    this.queue.pause();
    return true;
  }

  resume(): boolean {
    this.queue.start();
    return false;
  }

  async cancel(runId: string): Promise<void> {
    this.active.get(runId)?.abort();
    await this.closeTab(runId);
  }

  async stop(): Promise<void> {
    this.queue.pause();
    this.queue.clear();
    await Promise.all([...this.active.keys()].map((id) => this.cancel(id)));
    await Promise.allSettled(this.running);
  }
}
