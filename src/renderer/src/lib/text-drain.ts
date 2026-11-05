/** Frames to spread a backlog over: bigger backlogs drain faster, so the shown text never falls far behind the stream. */
const CATCH_UP_FRAMES = 6;
/** Characters revealed per frame at least (about 120 per second at 60 fps), so a trickle still looks like typing. */
const MIN_PER_FRAME = 2;

export interface TextDrainOptions {
  write(shown: string): void;
  raf?: (callback: () => void) => number;
  caf?: (handle: number) => void;
  /** Reveal everything at once (prefers-reduced-motion). */
  reduced?: boolean;
}

/**
 * Reveals streamed text on animation frames at a steady, adaptive pace (the way chat apps type out a reply) instead of in
 * the bursts it arrives in. It touches the DOM through `write` only, so the thread does not re-render per frame.
 */
export function createTextDrain({
  write,
  raf = requestAnimationFrame,
  caf = cancelAnimationFrame,
  reduced = false,
}: TextDrainOptions) {
  let target = '';
  let shown = 0;
  let handle: number | null = null;

  const step = (): void => {
    handle = null;
    const backlog = target.length - shown;
    if (backlog <= 0) return;
    let next = Math.min(target.length, shown + Math.max(MIN_PER_FRAME, Math.ceil(backlog / CATCH_UP_FRAMES)));
    // Never cut a surrogate pair (an emoji) in half.
    const last = target.charCodeAt(next - 1);
    if (next < target.length && last >= 0xd800 && last <= 0xdbff) next += 1;
    shown = next;
    write(target.slice(0, shown));
    if (shown < target.length) handle = raf(step);
  };

  return {
    /** The full text received so far (it only grows; a shorter text starts over). */
    update(text: string): void {
      if (text.length < shown) shown = 0;
      target = text;
      if (reduced) return this.flush();
      if (handle === null && shown < target.length) handle = raf(step);
    },
    /** Shows everything now (the reply ended or was cancelled). */
    flush(): void {
      if (handle !== null) caf(handle);
      handle = null;
      shown = target.length;
      write(target);
    },
    stop(): void {
      if (handle !== null) caf(handle);
      handle = null;
    },
  };
}
