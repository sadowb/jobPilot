import { app } from 'electron';
import type { Logger } from 'pino';

type Task = () => void | Promise<void>;

/**
 * Single owner of process exit. The first quit request (menu, ⌘Q, SIGTERM, logout, last window on Windows/Linux)
 * runs every registered task once, newest first (reverse of start order), within a deadline, then ends the
 * process with app.exit(), which emits no further quit events. Quit requests that arrive while it drains are
 * absorbed, so nothing ever calls app.quit() again from inside Electron's quit dispatch.
 */
export class Shutdown {
  private readonly tasks: { name: string; run: Task }[] = [];
  private draining = false;
  private current: string | undefined;

  constructor(
    private readonly logger: Logger,
    private readonly deadlineMs = 10_000,
    private readonly exit: (code: number) => void = (code) => app.exit(code),
  ) {}

  /** Register a stop step as its service starts; it runs before every step registered earlier. */
  register(name: string, run: Task): void {
    this.tasks.push({ name, run });
  }

  /** The app's only 'before-quit' listener. */
  readonly onBeforeQuit = (event: { preventDefault(): void }): void => {
    event.preventDefault();
    if (this.draining) return;
    this.draining = true;
    void this.drain().then(this.exit);
  };

  /** Resolves with the exit code: 0 when every step finished, 1 when one failed or the deadline passed. */
  async drain(): Promise<number> {
    this.logger.info({ steps: this.tasks.map((task) => task.name).reverse() }, 'Shutdown started');
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<'deadline'>((resolve) => {
      timer = setTimeout(() => resolve('deadline'), this.deadlineMs);
    });
    const steps = (async () => {
      let code = 0;
      for (const task of [...this.tasks].reverse()) {
        this.current = task.name;
        try {
          await task.run();
          this.logger.info({ step: task.name }, 'Shutdown step done');
        } catch (error) {
          code = 1;
          this.logger.error(
            { step: task.name, error_class: error instanceof Error ? error.constructor.name : 'Unknown' },
            'Shutdown step failed',
          );
        }
      }
      this.current = undefined;
      return code;
    })();
    const outcome = await Promise.race([steps, deadline]);
    clearTimeout(timer);
    if (outcome === 'deadline') {
      this.logger.error({ step: this.current, deadline_ms: this.deadlineMs }, 'Shutdown deadline passed');
      return 1;
    }
    this.logger.info({ exit_code: outcome }, 'Shutdown finished');
    return outcome;
  }
}
