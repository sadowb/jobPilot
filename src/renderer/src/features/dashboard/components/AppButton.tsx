import { Button, cx, type ButtonProps } from '../../../components/ui';

// App buttons inherit the board's 400 weight and 15px default size, with compact controls at 13.5px.
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

/** ui/Button with the app shell's inherited font sizes and colors. */
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
