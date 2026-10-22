import { BOT, BOT_BADGE, BOT_MOTION, BOT_ORB } from './botStyles';
import { CRITTER_ART } from './critterArt';
import { cx } from './ui';
import type { CritterState } from './critterState';

export type { CritterState } from './critterState';

/** Agent critter for one job (company name + state). Motion comes from `botStyles`. */
export function CritterBot({ agent, state, size }: { agent: string; state: CritterState; size: number }) {
  const art = CRITTER_ART[`${agent}:${state}`];
  return (
    <span className={cx(BOT, BOT_MOTION[state])} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="-1 -3 50 50"
        role="img"
        aria-label={`${agent} agent, ${state}`}
        className="overflow-visible"
      >
        {art?.()}
      </svg>
      {state === 'need' && <i className={BOT_BADGE} aria-hidden="true" />}
      {state === 'work' && <i className={BOT_ORB} aria-hidden="true" />}
    </span>
  );
}
