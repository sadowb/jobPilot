import type { ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './cx';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'danger-fill';
export type ButtonSize = 'md' | 'sm' | 'icon' | 'icon-sm';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-[1.5px] font-normal transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-[18px]',
  {
    variants: {
      variant: {
        default: 'border-ink bg-transparent text-ink hover:bg-hover',
        primary: 'border-pri bg-pri text-on-pri hover:bg-pri-h hover:border-pri-h',
        ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-hover',
        danger: 'border-bad bg-bg text-bad hover:bg-bad-tint',
        'danger-fill': 'border-bad bg-bad text-white dark:text-[#2A0907]',
      },
      size: {
        md: 'min-h-11 px-5 text-[14.5px]',
        sm: 'min-h-[34px] px-3.5 text-[13.5px]',
        icon: 'size-10 min-w-10 p-0 text-[14.5px]',
        'icon-sm': 'size-9 min-w-9 p-0 text-[13.5px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'default', size = 'md', type = 'button', className, ...rest }: ButtonProps) {
  return <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...rest} />;
}
