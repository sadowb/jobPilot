import { describe, expect, it } from 'vitest';
import { createTextDrain } from '../src/renderer/src/lib/text-drain';

function harness(reduced = false) {
  const frames: Array<() => void> = [];
  const written: string[] = [];
  const drain = createTextDrain({
    write: (s) => written.push(s),
    raf: (cb) => frames.push(cb),
    caf: (h) => void (frames[h - 1] = () => undefined),
    reduced,
  });
  const frame = () => frames.shift()?.();
  return { drain, written, frame, pending: () => frames.length };
}

describe('text drain (#255)', () => {
  it('reveals text a little per frame and ends exactly on the target', () => {
    const h = harness();
    h.drain.update('Hello, this is a streamed reply.');
    h.frame();
    expect(h.written[0]!.length).toBeGreaterThanOrEqual(2);
    expect(h.written[0]!.length).toBeLessThan(32);
    while (h.pending()) h.frame();
    expect(h.written.at(-1)).toBe('Hello, this is a streamed reply.');
    expect(h.written.every((w, i) => i === 0 || w.length > h.written[i - 1]!.length)).toBe(true);
  });

  it('never lags: a large backlog drains within a bounded number of frames', () => {
    const h = harness();
    h.drain.update('x'.repeat(5000));
    let frames = 0;
    while (h.pending()) {
      h.frame();
      frames += 1;
    }
    expect(h.written.at(-1)).toHaveLength(5000);
    expect(frames).toBeLessThan(60);
  });

  it('keeps a bounded backlog while text keeps arriving faster than the minimum pace', () => {
    const h = harness();
    let received = '';
    let maxBacklog = 0;
    for (let i = 0; i < 200; i++) {
      received += 'abcdefghij'; // 10 chars per frame
      h.drain.update(received);
      h.frame();
      maxBacklog = Math.max(maxBacklog, received.length - (h.written.at(-1)?.length ?? 0));
    }
    expect(maxBacklog).toBeLessThan(80);
  });

  it('flushes at once on done or cancel and schedules nothing more', () => {
    const h = harness();
    h.drain.update('a long enough reply to need several frames');
    h.frame();
    h.drain.flush();
    expect(h.written.at(-1)).toBe('a long enough reply to need several frames');
    while (h.pending()) h.frame();
    expect(h.written.at(-1)).toBe('a long enough reply to need several frames');
  });

  it('shows everything immediately under reduced motion', () => {
    const h = harness(true);
    h.drain.update('instant');
    expect(h.written).toEqual(['instant']);
    expect(h.pending()).toBe(0);
  });

  it('does not split an emoji', () => {
    const h = harness();
    h.drain.update('ab😀cd');
    while (h.pending()) h.frame();
    for (const w of h.written) expect(/[\ud800-\udbff]$/.test(w)).toBe(false);
  });

  it('starts over for a shorter text', () => {
    const h = harness();
    h.drain.update('first reply text');
    while (h.pending()) h.frame();
    h.drain.update('new');
    while (h.pending()) h.frame();
    expect(h.written.at(-1)).toBe('new');
  });
});
