/**
 * Class strings shared by several profile components.
 *
 * Mind the unlayered globals (`button{font:inherit;color:inherit}` and `.app button`, `.app a`): they outrank every
 * layered Tailwind utility, so a font or colour utility on a button or link only takes effect with `!`. Where the old
 * profile.css relied on a single-class selector, those declarations never won over the globals and are not repeated.
 */

/** Mono caps label (`.v17x`). */
const mono = 'font-mono tracking-[0.06em] text-muted uppercase';
export const monoLabel = `${mono} text-[11px]`;
/** `.pf-meta` / `.pf-tag`: the same label at 10.5px, medium weight. */
export const monoMeta = `${mono} text-[10.5px] leading-[normal] font-medium`;
/** Muted helper under a control (`.pf-hint`). */
export const hintText = 'mb-3.5 text-xs text-muted';
/** Empty state inside a card, dialog or list (`.pf-empty`). */
export const emptyText = 'my-3 text-[13px] text-muted';
/** Button group (`.profile-actions`). */
export const actionsRow = 'flex flex-none flex-wrap items-center gap-2';
/** Card/section title (`.profile-card h2`, `.pf-docs-head h2`, `.pf-knowledge h2`). */
export const sectionTitle = 'm-0 font-sans text-base font-[650] tracking-[-0.01em]';

/** Country / dial-code picker (`.pf-dial*`). The trigger keeps the inherited 15px: the old 13.5px rule never won. */
export const dialButton =
  'flex h-full min-h-11 items-center gap-2 rounded-xl border border-line-2 bg-bg px-2.5';
export const dialPanel =
  'absolute top-[calc(100%+6px)] left-0 z-[5] w-[300px] rounded-[14px] border border-line bg-bg p-2 shadow-float';
export const dialSearch =
  'box-border min-h-9 w-full rounded-[10px] border border-line bg-transparent px-2.5 font-sans text-[13.5px] leading-[normal] text-ink';
export const dialList = 'mt-1.5 max-h-[220px] overflow-y-auto';
export const dialItem =
  'flex min-h-9 w-full items-center gap-2.5 rounded-lg bg-transparent px-2 text-left text-[13.5px]! hover:bg-hover group-aria-selected:bg-hover';
export const dialName = 'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap';
export const dialCode = 'font-mono text-xs leading-[normal] font-medium text-muted';
/** Field-level error line (`.pf-field-error`). */
export const fieldError = 'text-xs font-medium text-bad';
