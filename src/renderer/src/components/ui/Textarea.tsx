import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { controlBox, controlMedium } from './controlStyles';
import { cx } from './cx';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(controlBox, controlMedium, 'resize-y', className)} {...rest} />;
});
