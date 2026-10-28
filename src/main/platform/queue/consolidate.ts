import { chmodSync } from 'node:fs';
import { buildDBClient, Runner, SqliteQueue } from 'liteque';
import { z } from 'zod';

const PayloadSchema = z.object({ reason: z.enum(['nightly', 'manual']) }).strict();
type Payload = z.infer<typeof PayloadSchema>;
const NIGHTLY_HOUR = 3;

/** Local 03:00 strictly after `from`. */
export function nextNightly(from: Date): Date {
  const next = new Date(from);
  next.setHours(NIGHTLY_HOUR, 0, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Nightly memory consolidation. The delayed job is persisted, so a night the app was closed runs at the
 * next launch; the runner (2 s poll, so quit waits at most that long) lives in this process only (no daemon, no login item; ADR 0016).
 */
export class ConsolidationWorker {
  private database?: ReturnType<typeof buildDBClient>;
  private queue?: SqliteQueue<Payload>;
  private runner?: Runner<Payload>;
  private loop?: Promise<void>;
  private readonly controller = new AbortController();

  constructor(
    private readonly file: string,
    private readonly consolidate: (signal: AbortSignal) => Promise<void>,
    private readonly onError: (error: unknown) => void,
  ) {}

  /** Idempotent; the queue file is created only once memory exists. */
  start(): void {
    if (this.loop) return;
    const database = buildDBClient(this.file, { runMigrations: true });
    chmodSync(this.file, 0o600);
    const queue = new SqliteQueue<Payload>('memory-sleep', database, {
      defaultJobArgs: { numRetries: 0 },
      keepFailedJobs: false,
    });
    this.database = database;
    this.queue = queue;
    this.runner = new Runner(
      queue,
      {
        run: async () => {
          try {
            await this.consolidate(this.controller.signal);
          } finally {
            if (!this.controller.signal.aborted) await this.schedule();
          }
        },
        onError: async ({ error }) => this.onError(error),
      },
      { concurrency: 1, pollIntervalMs: 2000, timeoutSecs: 1200, validator: PayloadSchema },
    );
    this.loop = this.runner.run().catch(this.onError);
    void this.schedule().catch(this.onError);
  }

  /** Enqueue the next 03:00 pass; the date-keyed idempotency key makes repeat calls harmless. */
  private async schedule(): Promise<void> {
    const at = nextNightly(new Date());
    await this.queue?.enqueue(
      { reason: 'nightly' },
      { idempotencyKey: `nightly-${at.toISOString().slice(0, 13)}`, delayMs: at.getTime() - Date.now() },
    );
  }

  /** Run one pass now (owner action or tests); same code path as the nightly job. */
  async runNow(): Promise<void> {
    await this.queue?.enqueue({ reason: 'manual' }, { idempotencyKey: `manual-${Date.now()}` });
  }

  async stop(): Promise<void> {
    this.controller.abort();
    this.runner?.stop();
    await this.loop;
    this.database?.$client.close();
  }
}
