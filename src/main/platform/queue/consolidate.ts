const NIGHTLY_HOUR = 3;

/** Local 03:00 strictly after `from`. */
export function nextNightly(from: Date): Date {
  const next = new Date(from);
  next.setHours(NIGHTLY_HOUR, 0, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  return next;
}

/** Local 03:00 at or before `from`. */
export function previousNightly(from: Date): Date {
  const previous = nextNightly(from);
  previous.setDate(previous.getDate() - 1);
  return previous;
}

/**
 * Nightly memory consolidation. A timer lives in this process only (no daemon, no login item; ADR 0016); the last
 * successful pass is persisted, so a night the app was closed runs once at the next launch.
 */
export class ConsolidationWorker {
  private started = false;
  private timer?: NodeJS.Timeout;
  private current?: Promise<void>;
  private readonly controller = new AbortController();

  constructor(
    private readonly consolidate: (signal: AbortSignal) => Promise<void>,
    private readonly onError: (error: unknown) => void,
    private readonly lastRun: { get: () => number | undefined; set: (at: number) => void },
  ) {}

  /** Idempotent; called once memory is ready. */
  start(): void {
    if (this.started) return;
    this.started = true;
    const now = new Date();
    const last = this.lastRun.get();
    if (last === undefined)
      this.lastRun.set(now.getTime()); // fresh memory has no missed night
    else if (last < previousNightly(now).getTime()) void this.run();
    this.arm();
  }

  private arm(): void {
    this.timer = setTimeout(
      () => void this.run().finally(() => this.started && this.arm()),
      nextNightly(new Date()).getTime() - Date.now(),
    );
    this.timer.unref();
  }

  /** One pass at a time; a failed pass leaves the last-run time alone so the next launch retries. */
  private run(): Promise<void> {
    this.current ??= this.consolidate(this.controller.signal)
      .then(() => this.lastRun.set(Date.now()))
      .catch(this.onError)
      .finally(() => (this.current = undefined));
    return this.current;
  }

  /** Run one pass now (owner action or tests); same code path as the nightly job. */
  async runNow(): Promise<void> {
    if (this.started) await this.run();
  }

  async stop(): Promise<void> {
    this.started = false;
    clearTimeout(this.timer);
    this.controller.abort();
    await this.current;
  }
}
