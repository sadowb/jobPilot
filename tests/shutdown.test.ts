import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { exit: vi.fn() } }));
const { Shutdown } = await import('../src/main/app/shutdown');

const logger = () => ({ info: vi.fn(), error: vi.fn() }) as unknown as import('pino').Logger;
const quitEvent = () => ({ preventDefault: vi.fn() });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Shutdown coordinator', () => {
  it('runs every step once, newest first, then exits 0', async () => {
    const order: string[] = [];
    const exit = vi.fn();
    const shutdown = new Shutdown(logger(), 1_000, exit);
    shutdown.register('backups', () => void order.push('backups'));
    shutdown.register('memory', async () => void order.push('memory'));
    shutdown.register('runs', async () => void order.push('runs'));

    const first = quitEvent();
    shutdown.onBeforeQuit(first);
    // A second quit request (⌘Q again, SIGTERM during drain) is absorbed, not re-run.
    const second = quitEvent();
    shutdown.onBeforeQuit(second);
    await settle();

    expect(first.preventDefault).toHaveBeenCalled();
    expect(second.preventDefault).toHaveBeenCalled();
    expect(order).toEqual(['runs', 'memory', 'backups']);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('keeps going after a failing step and exits 1', async () => {
    const ran: string[] = [];
    const exit = vi.fn();
    const shutdown = new Shutdown(logger(), 1_000, exit);
    shutdown.register('backups', () => void ran.push('backups'));
    shutdown.register('runs', () => {
      throw new Error('tab close failed');
    });
    shutdown.onBeforeQuit(quitEvent());
    await settle();
    expect(ran).toEqual(['backups']);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits 1 at the deadline and names the stuck step', async () => {
    vi.useFakeTimers();
    const log = logger();
    const exit = vi.fn();
    const shutdown = new Shutdown(log, 5_000, exit);
    shutdown.register('runs', () => new Promise(() => undefined));
    shutdown.onBeforeQuit(quitEvent());
    await vi.advanceTimersByTimeAsync(5_000);
    expect(exit).toHaveBeenCalledWith(1);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'runs', deadline_ms: 5_000 }),
      'Shutdown deadline passed',
    );
    vi.useRealTimers();
  });
});
