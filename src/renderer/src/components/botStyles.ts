// Shared utilities for the row-avatar bots (V17AgentBot, AgentBotArt, CritterBot). The art tags its parts with the hook classes
// `body`, `eye`, `pupil`, `prop` and `chkpop`; the per-state wrapper animates them through arbitrary child variants.
// The keyframes (`blink`, `dart`, `hop`, `pop`, `shake`, `ping`) are defined in styles/board.css. Reduced motion is handled by
// the global `animation: none !important` rule in styles/index.css.
type BotState = 'idle' | 'work' | 'need' | 'block' | 'done';

export const BOT = 'relative inline-block flex-none [&_svg_*]:origin-center [&_svg_*]:[transform-box:fill-box]';

const BLINK = '[&_.eye]:animate-[blink_4s_infinite]';
const DART = '[&_.pupil]:animate-[dart_1.4s_cubic-bezier(.65,0,.35,1)_infinite]';

export const BOT_MOTION: Record<BotState, string> = {
  idle: BLINK,
  work: `${DART} ${BLINK}`,
  need: '[&_.body]:animate-[hop_1.8s_cubic-bezier(.34,1.56,.64,1)_infinite]',
  block: '[&_.body]:animate-[shake_2.4s_infinite]',
  done: '[&_.chkpop]:animate-[pop_2.4s_cubic-bezier(.34,1.56,.64,1)_infinite]',
};

/** `--bot-ink`, the outline of body and hat: near-black on light, near-white on dark (the only themed part of the art). */
export const BOT_INK = '[--bot-ink:#1a1a1a] dark:[--bot-ink:#f5f5f5]';

/** The orbiting ring of a working bot. */
export const BOT_ORB =
  'absolute -inset-[5px] rounded-full border-[3px] border-transparent border-t-brand border-r-brand animate-jp-spin';

/** The waiting badge of a bot that needs the user. */
export const BOT_BADGE =
  'absolute -top-[3px] -right-[3px] grid size-2.5 place-items-center rounded-full border-[2.5px] border-bg bg-need-dot animate-[ping_1.8s_ease-out_infinite]';
