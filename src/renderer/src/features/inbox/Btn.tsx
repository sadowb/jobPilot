import { Button, cx, type ButtonProps, type ButtonSize, type ButtonVariant } from '../../components/ui';

/**
 * `ui/Button` plus `!` on its font and colour utilities.
 *
 * board.css still ships `.app button { font: inherit; color: inherit }` (unlayered), which beats every layered
 * Tailwind utility on a `<button>`, so today's buttons render at the inherited weight (400) with only the
 * `.btn.sm` size applied. This wrapper reproduces that look. Once the rule is gone, switch to `Button` directly
 * (semibold, 14.5px md) if the design is meant to follow the board CSS.
 */
const COLOR: Record<ButtonVariant, string> = {
  default: 'text-ink!',
  primary: 'text-on-pri!',
  ghost: 'text-ink-2!',
  danger: 'text-bad!',
  'danger-fill': 'text-white!',
};

const FONT: Record<ButtonSize, string> = {
  md: 'text-[15px]! font-normal!',
  sm: 'text-[13.5px]! font-normal!',
  icon: 'text-[15px]! font-normal!',
  'icon-sm': 'text-[13.5px]! font-normal!',
};

export function Btn({ variant = 'default', size = 'md', className, ...rest }: ButtonProps) {
  return <Button variant={variant} size={size} className={cx(COLOR[variant], FONT[size], className)} {...rest} />;
}
