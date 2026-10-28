import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsolidationWorker, nextNightly, previousNightly } from '../src/main/platform/queue/consolidate';

afterEach(() => vi.useRealTimers());

describe('nightly schedule', () => {
  it('picks the 03:00 around now', () => {
    const noon = new Date(2026, 9, 28, 12);
    expect(nextNightly(noon)).toEqual(new Date(2026, 9, 29, 3));
    expect(previousNightly(noon)).toEqual(new Date(2026, 9, 28, 3));
    const night = new Date(2026, 9, 28, 1);
    expect(nextNightly(night)).toEqual(new Date(2026, 9, 28, 3));
    expect(previousNightly(night)).toEqual(new Date(2026, 9, 27, 3));
  });
});

function setup(last: number | undefined) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 12));
  let stored = last;
  const consolidate = vi.fn(async () => undefined);
  const worker = new ConsolidationWorker(consolidate, () => undefined, {
    get: () => stored,
    set: (at) => (stored = at),
  });
  return { worker, consolidate, stored: () => stored };
}

describe('ConsolidationWorker', () => {
  it('catches up once when the last pass is older than the previous 03:00', async () => {
    const t = setup(new Date(2026, 9, 27, 4).getTime());
    t.worker.start();
    t.worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.consolidate).toHaveBeenCalledTimes(1);
    expect(t.stored()).toBe(Date.now());
    await t.worker.stop();
  });

  it('does not catch up when the last pass is after the previous 03:00', async () => {
    const t = setup(new Date(2026, 9, 28, 4).getTime());
    t.worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.consolidate).not.toHaveBeenCalled();
    await t.worker.stop();
  });

  it('records a baseline instead of running on first start, then runs at 03:00', async () => {
    const t = setup(undefined);
    t.worker.start();
    expect(t.stored()).toBe(Date.now());
    await vi.advanceTimersByTimeAsync(0);
    expect(t.consolidate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15 * 3600_000 + 1000);
    expect(t.consolidate).toHaveBeenCalledTimes(1);
    await t.worker.stop();
  });
});
