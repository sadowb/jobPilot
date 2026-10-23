import { useNavigate } from 'react-router-dom';
import { Button, cn, type ButtonProps } from '../components/ui';

/** Class strings and helpers shared by the onboarding, settings, analytics and ⌘K features (V17 board vocabulary). */

/**
 * Typography and surface fragments from the V17 board vocabulary. Each one sets only what the old class set; callers add
 * the size, padding and max-width they used to override inline, so no two utilities ever compete for a property.
 */

/** `.s` colour (the old class also set 13.5px: add `text-[13.5px]` or the size the element overrode it with). */
export const S = 'text-muted';
/** `.spec`: mono caption. */
export const SPEC = 'font-mono text-[11.5px] tracking-[0.06em]';
/** `.v17x` minus its colour: mono uppercase label. */
export const MONO_CAPS = 'font-mono text-[11px] tracking-[0.06em] uppercase';
/** `.v17x`: mono uppercase muted label. */
export const V17X = `${MONO_CAPS} text-muted`;
/** `.v17n`: serif tabular numeral. Size comes from the caller. */
export const V17N = 'font-serif font-[350] [line-height:1] tracking-[-0.02em] tabular-nums';
/** `.h1` minus size and leading: serif display heading. */
export const H1 = 'm-0 font-serif font-[350] tracking-[-0.025em]';
/** `.h1` as the boards set it: 46px / 1.02. */
export const H1_STD = `${H1} text-[46px] leading-[1.02]`;
/** `.it`: italic serif tail of a heading. */
export const IT = 'font-serif font-light tracking-[-0.01em] italic';
/** `.bub.a` shape; the caller adds max-width, padding and font size. */
export const BUBBLE = 'rounded-[20px] rounded-bl-[6px] border border-line bg-bg leading-normal';
/** `.mcell` shape (stays `bg` in dark, unlike Card); the caller adds gap and padding. */
export const CELL = 'flex min-w-0 flex-col rounded-3xl border border-line bg-bg';
/** Small tinted status pill (queued, running, application status). Colours come from the caller. */
export const PILL = 'inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap';

/*
 * V17 motion. Keyframes live in the Tailwind entry stylesheet; `--d` (delay) and `--dur` are set per element with `[--d:.3s]` or cssVars.
 */
export const A_RISE = 'animate-[v17rise_0.3s_cubic-bezier(0.2,0.8,0.2,1)_var(--d,0s)_both] motion-reduce:animate-none';
export const A_POP = 'animate-[v17pop_0.3s_cubic-bezier(0.34,1.56,0.64,1)_var(--d,0s)_both] motion-reduce:animate-none';
export const A_BAR = 'animate-[v17bar_var(--dur,0.3s)_ease-out_var(--d,0s)_both] motion-reduce:animate-none';
export const A_CARDIN =
  'animate-[v17cardin_0.3s_cubic-bezier(0.34,1.56,0.64,1)_var(--d,0s)_both] motion-reduce:animate-none';
export const A_COLLAPSE =
  'max-h-0 overflow-hidden opacity-0 animate-[v17collapse_0.25s_ease-in-out_var(--d,0s)_both] motion-reduce:animate-none';
export const A_LAND =
  'v17-land animate-[v17land_0.9s_cubic-bezier(0.2,0.8,0.2,1)_var(--d,0s)_both] motion-reduce:animate-none';
export const A_LIFT =
  'v17-lift animate-[v17lift_1.1s_cubic-bezier(0.65,0,0.35,1)_var(--d,0s)_both] motion-reduce:animate-none';
export const A_BOB = 'animate-[v17bob_3.2s_ease-in-out_1.2s_infinite] motion-reduce:animate-none';
/** `.v17-trail`: dashed path that draws itself. Reduced motion shows the finished line. */
export const A_TRAIL =
  '[stroke-dasharray:1_1] [stroke-dashoffset:1] animate-[v17draw_var(--dur,1s)_ease-out_var(--d,0s)_forwards] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]!';
/** Wind lines of `CapDartArt gust` inside a landing/lifting wrapper (`.v17-land .gust`, `.v17-lift .gust`). */
export const A_GUST =
  '[&_.gust]:[stroke-dasharray:8_5] [&_.gust]:animate-[v17gust_0.5s_linear_infinite,v17gustoff_0.01s_linear_1s_forwards] motion-reduce:[&_.gust]:animate-none! motion-reduce:[&_.gust]:opacity-0!';
/** `.v17` under reduced motion: every animation and transition in the subtree stops. */
export const REDUCE_ALL = 'motion-reduce:**:animate-none! motion-reduce:**:transition-none!';

/* The shell buttons use the V17 board's inherited weight and size, with explicit variant colors. */
const SHELL_BUTTON: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'text-ink!',
  primary: 'text-on-pri! hover:border-pri!',
  // `.btn.ghost` has no hover state: its background rule outranks `.btn:hover`.
  ghost: 'text-ink-2! hover:bg-transparent!',
  danger: 'text-bad!',
  'danger-fill': 'text-white!',
};
export const shellButton = (variant: NonNullable<ButtonProps['variant']> = 'default') =>
  cn('font-semibold! text-[13.5px]!', SHELL_BUTTON[variant]);

/** A Button that navigates (the old `NavButton`). Inside the shell, add `shellButton(variant)` to its className. */
export function GoButton({ to, onClick, className, ...rest }: { to: string } & ButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      {...rest}
      className={cn('cursor-pointer', className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) void navigate(to);
      }}
    />
  );
}
