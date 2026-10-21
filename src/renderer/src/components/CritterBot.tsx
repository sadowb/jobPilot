import { CRITTER_ART } from './critterArt';
import type { CritterState } from './critterState';

export type { CritterState } from './critterState';

// Class sets are the boards': working and idle critters blink, "need" carries the attention badge,
// "work" carries the spinning orb.
const MOTION: Record<CritterState, string> = {
  need: 'm-need',
  block: 'm-block',
  work: 'm-work m-blink',
  idle: 'm-blink',
  done: 'm-done',
};

/** Agent critter for one job (company name + state). Motion comes from board.css (`.mv`, `.m-*`). */
export function CritterBot({ agent, state, size }: { agent: string; state: CritterState; size: number }) {
  const art = CRITTER_ART[`${agent}:${state}`];
  return (
    <span
      className={`bot mv ${MOTION[state]}`}
      style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-1 -3 50 50"
        role="img"
        aria-label={`${agent} agent, ${state}`}
        style={{ overflow: 'visible' }}
      >
        {art?.()}
      </svg>
      {state === 'need' && <i className="wb" aria-hidden="true" style={{ width: 10, height: 10 }} />}
      {state === 'work' && <i className="orb" aria-hidden="true" style={{ inset: -5, borderWidth: 3 }} />}
    </span>
  );
}
