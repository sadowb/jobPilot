import { chmodSync } from 'node:fs';
import { buildDBClient, Runner, SqliteQueue } from 'liteque';
import { z } from 'zod';

const PayloadSchema = z.object({ runId: z.ulid() }).strict();
type Payload = z.infer<typeof PayloadSchema>;

// Gate dequeue itself: liteque 0.10.0 Runner.runImpl checks `stopping` only before `await semaphore.waitForUnlock()`,
// so stop() while all slots are busy still claims one job. Upstream: karakeep-app/liteque (not yet filed/fixed), tracked in
// sadowb/jobPilot#145.
// shortcut: dequeue override is a monkey-patch of a library method, delete it once liteque re-checks `stopping` after the wait.
class ApplyQueue extends SqliteQueue<Payload> {
  paused = true;

  override async attemptDequeue(options: { timeoutSecs: number }) {
    return this.paused ? null : super.attemptDequeue(options);
  }
}

export class ApplyWorker {
  private readonly database: ReturnType<typeof buildDBClient>;
  private readonly queue: ApplyQueue;
  private readonly runner: Runner<Payload>;
  private readonly active = new Map<string, AbortController>();
  private loop?: Promise<void>;
  /** Startup cleanup of stale non-running tasks; enqueue waits so it cannot be deleted. */
  private readonly cleaned: Promise<number>;

  constructor(
    file: string,
    concurrency: number,
    execute: (runId: string, signal: AbortSignal) => Promise<void>,
    private readonly closeTab: (runId: string) => Promise<void>,
    private readonly onError: (error: unknown, runId?: string) => void,
    timeoutMs = 900_000,
  ) {
    this.database = buildDBClient(file, { runMigrations: true });
    chmodSync(file, 0o600);
    this.queue = new ApplyQueue('apply', this.database, {
      defaultJobArgs: { numRetries: 0 },
      keepFailedJobs: false,
    });
    // The run rows are authoritative. Startup re-enqueues queued rows after failing interrupted runs.
    this.cleaned = this.queue.cancelAllNonRunning();
    this.purgeOrphanedRunning();
    this.runner = new Runner(
      this.queue,
      {
        run: async ({ data, abortSignal }) => {
          const controller = new AbortController();
          this.active.set(data.runId, controller);
          try {
            await execute(data.runId, AbortSignal.any([controller.signal, abortSignal]));
          } finally {
            this.active.delete(data.runId);
          }
        },
        onError: async ({ error, data }) => this.onError(error, data?.runId),
      },
      { concurrency, pollIntervalMs: 25, timeoutSecs: Math.ceil(timeoutMs / 1000) + 60, validator: PayloadSchema },
    );
  }

  /** A `running` task at construction belongs to a crashed process (this one has not started), so drop it. */
  private purgeOrphanedRunning(): void {
    // shortcut: raw SQL on liteque's `tasks` table, it has no public API for running rows. Replace if one ships.
    this.database.$client.prepare("DELETE FROM tasks WHERE queue = ? AND status = 'running'").run('apply');
  }

  async enqueue(runId: string): Promise<void> {
    await this.cleaned;
    await this.queue.enqueue(PayloadSchema.parse({ runId }), { idempotencyKey: runId });
  }

  pause(): boolean {
    this.queue.paused = true;
    return true;
  }

  resume(): boolean {
    this.queue.paused = false;
    this.loop ??= this.cleaned.then(() => this.runner.run()).catch((error) => this.onError(error));
    return false;
  }

  async cancel(runId: string): Promise<void> {
    this.active.get(runId)?.abort();
    await this.closeTab(runId);
  }

  async stop(): Promise<void> {
    this.pause();
    this.runner.stop();
    await Promise.all([...this.active.keys()].map((id) => this.cancel(id)));
    await this.loop;
    this.database.$client.close();
  }
}
