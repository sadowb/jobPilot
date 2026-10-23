import { chmodSync } from 'node:fs';
import { buildDBClient, Runner, SqliteQueue } from 'liteque';
import { z } from 'zod';

const PayloadSchema = z.object({ runId: z.ulid() }).strict();
type Payload = z.infer<typeof PayloadSchema>;

// Gate dequeue itself: Runner.stop() can still claim a job while waiting for a slot.
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

  constructor(
    file: string,
    concurrency: number,
    execute: (runId: string, signal: AbortSignal) => Promise<void>,
    private readonly closeTab: (runId: string) => Promise<void>,
    private readonly onError: () => void,
  ) {
    this.database = buildDBClient(file, { runMigrations: true });
    chmodSync(file, 0o600);
    this.queue = new ApplyQueue('apply', this.database, {
      defaultJobArgs: { numRetries: 0 },
      keepFailedJobs: false,
    });
    // The run rows are authoritative. Startup re-enqueues queued rows after failing interrupted runs.
    this.database.$client.prepare('DELETE FROM tasks WHERE queue = ?').run('apply');
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
        onError: async () => this.onError(),
      },
      { concurrency, pollIntervalMs: 25, timeoutSecs: 120, validator: PayloadSchema },
    );
  }

  async enqueue(runId: string): Promise<void> {
    await this.queue.enqueue(PayloadSchema.parse({ runId }), { idempotencyKey: runId });
  }

  pause(): boolean {
    this.queue.paused = true;
    return true;
  }

  resume(): boolean {
    this.queue.paused = false;
    this.loop ??= this.runner.run().catch(() => this.onError());
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
