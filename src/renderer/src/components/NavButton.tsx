import type { ButtonHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * A `.btn` that navigates. It is a real <button> (not an anchor) because the boards' `.app button` reset
 * gives buttons their inherited weight and size, which anchors would not get.
 */
export function NavButton({ to, onClick, ...rest }: { to: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) void navigate(to);
      }}
    />
  );
}
