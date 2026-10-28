export interface ApplyHooks {
  /** Slots to fill right now; read live so a crew-size change applies to the next start. */
  crew: () => number;
  /** Atomically move the oldest queued run to running and return its id (the run table is the queue, ADR 0017). */
  claim: () => string | undefined;
  execute: (runId: string, signal: AbortSignal) => Promise<void>;
  closeTab: (runId: string) => Promise<void>;
  onError: (error: unknown, runId?: string) => void;
  stuck: {
    afterMs: () => number;
    progressAt: (runId: string) => number | undefined;
    /** Called before the run is aborted so the owner-facing status is set first. */
    onStuck: (runId: string) => void;
  };
}

const WATCHDOG_MS = 5_000;

/** Slot scheduler: at most `crew()` claimed runs execute at once. Holds no queue of its own. */
export class ApplyWorker {
  private readonly active = new Map<string, AbortController>();
  private readonly running = new Set<Promise<void>>();
  private paused = true;
  private stopping = false;
  private watchdog?: NodeJS.Timeout;

  constructor(private readonly hooks: ApplyHooks) {}

  /** A run row was set to `queued`; fill any free slot. */
  enqueue(): void {
    this.pump();
  }

  pause(): boolean {
    this.paused = true;
    return true;
  }

  resume(): boolean {
    this.paused = false;
    this.watchdog ??= setInterval(() => this.checkStuck(), WATCHDOG_MS).unref();
    this.pump();
    return false;
  }

  async cancel(runId: string): Promise<void> {
    this.active.get(runId)?.abort();
    await this.hooks.closeTab(runId);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    clearInterval(this.watchdog);
    await Promise.all([...this.active.keys()].map((id) => this.cancel(id)));
    await Promise.allSettled(this.running);
  }

  private pump(): void {
    while (!this.paused && !this.stopping && this.active.size < this.hooks.crew()) {
      let runId: string | undefined;
      try {
        runId = this.hooks.claim();
      } catch (error) {
        this.hooks.onError(error);
        return;
      }
      if (!runId) return;
      const id = runId;
      const controller = new AbortController();
      this.active.set(id, controller);
      const run: Promise<void> = this.hooks
        .execute(id, controller.signal)
        .catch((error: unknown) => this.hooks.onError(error, id))
        .finally(() => {
          this.active.delete(id);
          this.running.delete(run);
          this.pump();
        });
      this.running.add(run);
    }
  }

  private checkStuck(): void {
    const limit = this.hooks.stuck.afterMs();
    for (const [id, controller] of this.active) {
      const at = this.hooks.stuck.progressAt(id);
      if (controller.signal.aborted || at === undefined || Date.now() - at <= limit) continue;
      this.hooks.stuck.onStuck(id);
      controller.abort();
    }
  }
}
