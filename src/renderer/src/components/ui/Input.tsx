import { forwardRef, type InputHTMLAttributes } from 'react';
import { controlBox, controlMedium } from './controlStyles';
import { cx } from './cx';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(controlBox, controlMedium, className)} {...rest} />;
});
