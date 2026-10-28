import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplyWorker } from '../src/main/platform/queue/apply';

const gate = () => {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => (open = resolve));
  return { promise, open };
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

/** Fake run table: `queue` holds queued ids, claim() shifts one, like the real atomic UPDATE. */
function harness(initialCrew: number) {
  let crew = initialCrew;
  const queue: string[] = [];
  const started: string[] = [];
  const signals = new Map<string, AbortSignal>();
  const gates = new Map<string, ReturnType<typeof gate>>();
  const closed: string[] = [];
  const progress = new Map<string, number>();
  const stuck: string[] = [];
  const worker = new ApplyWorker({
    crew: () => crew,
    claim: () => queue.shift(),
    execute: async (id, signal) => {
      started.push(id);
      signals.set(id, signal);
      gates.set(id, gate());
      progress.set(id, Date.now());
      await gates.get(id)!.promise;
    },
    closeTab: async (id) => void closed.push(id),
    onError: () => undefined,
    stuck: { afterMs: () => 120_000, progressAt: (id) => progress.get(id), onStuck: (id) => void stuck.push(id) },
  });
  const add = (...ids: string[]) => {
    queue.push(...ids);
    worker.enqueue();
  };
  return { worker, add, setCrew: (n: number) => (crew = n), started, signals, gates, closed, progress, stuck, queue };
}

afterEach(() => vi.useRealTimers());

describe('ApplyWorker', () => {
  it('starts paused, then honours the crew cap in FIFO order', async () => {
    const h = harness(2);
    h.add('a', 'b', 'c');
    await tick();
    expect(h.started).toEqual([]);
    h.worker.resume();
    await tick();
    expect(h.started).toEqual(['a', 'b']);
    h.gates.get('a')!.open();
    await tick();
    expect(h.started).toEqual(['a', 'b', 'c']);
    h.gates.get('b')!.open();
    h.gates.get('c')!.open();
    await h.worker.stop();
  });

  it('reads the crew size live', async () => {
    const h = harness(1);
    h.worker.resume();
    h.add('a', 'b', 'c');
    await tick();
    expect(h.started).toEqual(['a']);
    h.setCrew(3);
    h.worker.enqueue();
    await tick();
    expect(h.started).toEqual(['a', 'b', 'c']);
    for (const id of ['a', 'b', 'c']) h.gates.get(id)!.open();
    await h.worker.stop();
  });

  it('pause starts nothing new', async () => {
    const h = harness(1);
    h.worker.resume();
    h.add('a', 'b');
    await tick();
    h.worker.pause();
    h.gates.get('a')!.open();
    await tick();
    expect(h.started).toEqual(['a']);
    await h.worker.stop();
  });

  it('stop claims nothing new while all slots are busy and waits for in-flight runs', async () => {
    const h = harness(1);
    h.worker.resume();
    h.add('a', 'b');
    await tick();
    let stopped = false;
    const stopping = h.worker.stop().then(() => (stopped = true));
    await tick();
    expect(h.signals.get('a')!.aborted).toBe(true);
    expect(stopped).toBe(false);
    h.gates.get('a')!.open();
    await stopping;
    await tick();
    expect(h.started).toEqual(['a']);
    expect(h.queue).toEqual(['b']);
  });

  it('cancel aborts only that run and closes its tab', async () => {
    const h = harness(2);
    h.worker.resume();
    h.add('a', 'b');
    await tick();
    await h.worker.cancel('a');
    expect(h.signals.get('a')!.aborted).toBe(true);
    expect(h.signals.get('b')!.aborted).toBe(false);
    expect(h.closed).toEqual(['a']);
    h.gates.get('a')!.open();
    h.gates.get('b')!.open();
    await h.worker.stop();
  });

  it('the stuck watchdog flags and aborts a silent run, leaving others alone', async () => {
    vi.useFakeTimers();
    const h = harness(2);
    h.worker.resume();
    h.add('a', 'b');
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100_000);
    h.progress.set('b', Date.now()); // b keeps reporting
    await vi.advanceTimersByTimeAsync(30_000);
    expect(h.stuck).toEqual(['a']);
    expect(h.signals.get('a')!.aborted).toBe(true);
    expect(h.signals.get('b')!.aborted).toBe(false);
    h.gates.get('a')!.open();
    h.gates.get('b')!.open();
    await h.worker.stop();
  });
});
