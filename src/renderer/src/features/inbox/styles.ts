/** Class strings shared across the inbox screens (Tailwind scans this file like any other source). */

/** Focus state of a pill/field that wraps a borderless input (the input's own ring is suppressed). */
export const FOCUS_WITHIN =
  'focus-within:border-ink focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_14%,transparent)]';

/** Borderless input that lives inside a pill or field. `outline-none!` beats the unlayered global focus ring. */
export const BARE_INPUT =
  'h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-ink outline-none! placeholder:text-muted placeholder:opacity-100';

/** `.eyebrow` at 11px (mono caps). */
export const EYEBROW = 'font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase';

/** Truncate to one line with an ellipsis. */
export const ELLIPSIS = 'overflow-hidden text-ellipsis whitespace-nowrap';

/** Card with a bordered 1px frame used by every widget in the message stream and the panels. */
export const WIDGET =
  'w-full self-start overflow-hidden rounded-[20px] border border-line bg-bg shadow-[0_1px_2px_rgb(0_0_0/.04)]';

/** Amber "needs you" pill, `.st.need` at the 24px size the review/consent panels use. */
export const NEED_PILL_SM =
  "inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-need-tint pr-2.5 pl-2 text-[12px] font-[650] text-need before:text-[11px] before:leading-none before:content-['◆']";

/** Same pill at the default 28px size (message widgets). */
export const NEED_PILL =
  "inline-flex h-7 items-center gap-[7px] whitespace-nowrap rounded-full bg-need-tint pr-3 pl-2.5 text-[13px] font-[650] text-need before:text-[11px] before:leading-none before:content-['◆']";

/** Amber callout box used by the Figma review and Notion consent panels. */
export const NEED_CARD =
  'flex flex-none flex-col gap-2 rounded-[18px] border-[1.5px] border-need-line bg-need-tint px-4 py-3.5';
export const MONO = 'font-mono text-[10.5px] tracking-[0.06em] whitespace-nowrap uppercase';
