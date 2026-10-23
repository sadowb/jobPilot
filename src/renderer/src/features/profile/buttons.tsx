import { Button, cn, type ButtonProps } from '../../components/ui';

/**
 * `Button size="sm"` with the unlayered `.app button{font:inherit;color:inherit}` accounted for: the old
 * `.btn.sm`/`.btn.pri`/`.btn.ghost`/`.btn.neg` rules were more specific than it, so their size and colour won.
 */
const FIX = {
  default: '',
  primary: 'text-on-pri! hover:border-pri!',
  ghost: 'text-ink-2!',
  danger: 'text-bad!',
  'danger-fill': '',
} as const;

export function PButton({ variant = 'default', className, ...rest }: Omit<ButtonProps, 'size'>) {
  return (
    <Button
      size="sm"
      variant={variant}
      className={cn('text-[13.5px]!', 'disabled:opacity-100!', FIX[variant], className)}
      {...rest}
    />
  );
}

/** `<a class="btn sm ghost">`: `.app a{color:inherit}` outranks the utility, hence `!`. */
export const ghostLinkButton =
  'inline-flex min-h-[34px] items-center justify-center gap-2 rounded-full border-[1.5px] border-transparent bg-transparent px-3.5 text-[13.5px] font-semibold whitespace-nowrap text-ink-2! transition-colors duration-[120ms] hover:bg-hover [&_svg]:size-[18px]';
