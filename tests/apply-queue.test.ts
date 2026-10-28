import { describe, expect, it } from 'vitest';
import { ApplyWorker } from '../src/main/platform/queue/apply';

const gate = () => {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => (open = resolve));
  return { promise, open };
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

function harness(concurrency: number) {
  const started: string[] = [];
  const signals = new Map<string, AbortSignal>();
  const gates = new Map<string, ReturnType<typeof gate>>();
  const closed: string[] = [];
  const worker = new ApplyWorker(
    concurrency,
    async (id, signal) => {
      started.push(id);
      signals.set(id, signal);
      gates.set(id, gate());
      await gates.get(id)!.promise;
    },
    async (id) => void closed.push(id),
    () => undefined,
  );
  return { worker, started, signals, gates, closed };
}

describe('ApplyWorker', () => {
  it('holds work until resumed, then honours the concurrency cap', async () => {
    const h = harness(2);
    for (const id of ['a', 'b', 'c']) await h.worker.enqueue(id);
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

  it('pause blocks new starts', async () => {
    const h = harness(1);
    h.worker.resume();
    await h.worker.enqueue('a');
    await h.worker.enqueue('b');
    await tick();
    h.worker.pause();
    h.gates.get('a')!.open();
    await tick();
    expect(h.started).toEqual(['a']);
    await h.worker.stop();
  });

  it('stop starts no new job while all slots are busy and waits for in-flight runs', async () => {
    const h = harness(1);
    h.worker.resume();
    await h.worker.enqueue('a');
    await h.worker.enqueue('b');
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
  });

  it('cancel aborts only that run and closes its tab', async () => {
    const h = harness(2);
    h.worker.resume();
    await h.worker.enqueue('a');
    await h.worker.enqueue('b');
    await tick();
    await h.worker.cancel('a');
    expect(h.signals.get('a')!.aborted).toBe(true);
    expect(h.signals.get('b')!.aborted).toBe(false);
    expect(h.closed).toEqual(['a']);
    h.gates.get('a')!.open();
    h.gates.get('b')!.open();
    await h.worker.stop();
  });

  it('a queued run cancelled before its turn never starts', async () => {
    const h = harness(1);
    h.worker.resume();
    await h.worker.enqueue('a');
    await h.worker.enqueue('b');
    await h.worker.cancel('b');
    h.gates.get('a')!.open();
    await tick();
    expect(h.started).toEqual(['a']);
    await h.worker.stop();
  });

  it('enqueues a duplicate run id once', async () => {
    const h = harness(2);
    h.worker.resume();
    await h.worker.enqueue('a');
    await h.worker.enqueue('a');
    await tick();
    expect(h.started).toEqual(['a']);
    h.gates.get('a')!.open();
    await h.worker.stop();
  });
});
