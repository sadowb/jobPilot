import { forwardRef, type SelectHTMLAttributes } from 'react';
import { controlBox } from './controlStyles';
import { cx } from './cx';

export type SelectSize = 'md' | 'sm';
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: SelectSize;
  /** Layout classes on the wrapper; e.g. w-auto min-w-28 flex-none for a salary period. */
  className?: string;
  controlClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', className, controlClassName, children, ...rest },
  ref,
) {
  return (
    <div className={cx('relative min-w-0 [:where(&)]:w-full', className)}>
      <select
        ref={ref}
        className={cx(
          controlBox,
          'min-w-0 appearance-none text-ellipsis',
          size === 'sm'
            ? 'min-h-[38px] rounded-[10px] py-[7px] pr-[34px] pl-3 leading-[1.4]'
            : 'min-h-11 rounded-field py-[11px] pr-[38px] pl-[13px] leading-[1.5]',
          controlClassName,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 right-3.5 size-3 -translate-y-1/2 text-muted"
      >
        <path d="M3 4.5l3 3 3-3" />
      </svg>
    </div>
  );
});
