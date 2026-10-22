import { Button, cx, type ButtonProps, type ButtonSize, type ButtonVariant } from '../../components/ui';

/**
 * `ui/Button` with inbox-specific 400 weight, 15px default and 13.5px compact sizes.
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
