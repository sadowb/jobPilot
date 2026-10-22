import { Button, cx, type ButtonProps } from '../../../components/ui';

// `.app button { font: inherit; color: inherit }` in board.css is unlayered, so it beats every layered
// utility the ui/Button sets, and (specificity 0,1,1) it also beats the board's plain `.btn` weight and size.
// The shipped look is therefore weight 400, and 15px for md; these important utilities reproduce it exactly.
const fixVariant: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'text-ink!',
  primary: 'text-on-pri!',
  ghost: 'text-ink-2!',
  danger: 'text-bad!',
  'danger-fill': 'text-white! dark:text-[#2A0907]!',
};
const fixSize: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'text-[15px]!',
  sm: 'text-[13.5px]!',
  icon: 'text-[15px]!',
  'icon-sm': 'text-[13.5px]!',
};

/** ui/Button with its font and colour pinned against the unlayered global button reset. */
export function AppButton({ variant = 'default', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cx('font-sans! font-normal!', fixVariant[variant], fixSize[size], className)}
      {...rest}
    />
  );
}
