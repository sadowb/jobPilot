import { useEffect, useState } from 'react';
import { cn } from '../../components/ui';
import { usePrefersReducedMotion } from '../../lib/motion';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TICK_MS = 55;

const pad = (text: string, width: number) => text.toUpperCase().padEnd(width, ' ').slice(0, width);

/**
 * One row of split-flap cells. Every cell shows random glyphs until its own settle tick (left to right), then its real
 * letter; a changed `text` spins again. Reduced motion shows the final text at once. The cells are decorative: the
 * wrapper carries the text for assistive technology.
 */
export function SplitFlap({
  text,
  width,
  settleFrom = 0,
  salt = 0,
  className,
}: {
  text: string;
  width: number;
  /** Tick at which the first cell settles; later cells settle ~0.7 tick apart. */
  settleFrom?: number;
  salt?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const target = pad(text, width);
  // The tick belongs to the text it counts for, so a new text starts from 0 without resetting state inside an effect.
  const [run, setRun] = useState({ text: target, tick: 0 });
  const last = settleFrom + Math.round((width - 1) * 0.7);
  useEffect(() => {
    if (reduced) return;
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      setRun({ text: target, tick });
      if (tick >= last) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [target, reduced, last]);
  const tick = run.text === target ? run.tick : 0;
  const shown = reduced
    ? target
    : [...target]
        .map((letter, i) =>
          tick >= settleFrom + Math.round(i * 0.7) ? letter : GLYPHS[(tick * 7 + i * 13 + salt * 31) % GLYPHS.length]!,
        )
        .join('');
  return (
    <span role="text" aria-label={text} className="flex gap-0.5 [perspective:400px]">
      {[...shown].map((letter, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ ['--d' as string]: `${(i * 0.03).toFixed(2)}s` }}
          className={cn(
            'relative inline-flex h-7 w-[18px] animate-ob-flap items-center justify-center rounded-[3px] bg-hover font-mono text-[14.5px] font-semibold motion-reduce:animate-none',
            'after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-ground',
            className,
          )}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
