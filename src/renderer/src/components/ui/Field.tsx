import {
  cloneElement,
  useId,
  type AriaAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from './cx';

type FieldControlProps = AriaAttributes & { id?: string };

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wide?: boolean;
  /** One control that forwards id and ARIA props to its input or radiogroup. */
  children: ReactElement<FieldControlProps>;
}

export function Field({ label, hint, error, wide = false, children, className, ...rest }: FieldProps) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  const labelId = `${generatedId}-label`;
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;
  const describedBy = cn(children.props['aria-describedby'], !!hint && hintId, !!error && errorId) || undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-[7px]', wide && 'col-span-full', className)} {...rest}>
      <label id={labelId} htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-labelledby': cn(labelId, children.props['aria-labelledby']),
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })}
      {hint && (
        <span id={hintId} className="mb-3.5 text-xs leading-[1.45] font-semibold text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="text-xs leading-[1.45] font-medium text-bad">
          {error}
        </span>
      )}
    </div>
  );
}

export function FieldGrid({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-5 [@media(width<=800px)]:grid-cols-1', className)} {...rest} />
  );
}
