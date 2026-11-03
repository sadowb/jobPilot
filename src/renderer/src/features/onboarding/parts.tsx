import type { ReactNode } from 'react';
import { CapDartArt } from '../../components/CapDartArt';
import { cn } from '../../components/ui';
import { MONO_CAPS } from '../shared-ui';

/** Mono caption above a group ("YOUR AI"). */
export function Cap({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(MONO_CAPS, 'text-muted', className)}>{children}</span>;
}

export function Spinner({ label = 'Working', className }: { label?: string; className?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block size-4 flex-none animate-jp-spin rounded-full border-2 border-line-2 border-t-brand motion-reduce:animate-none',
        className,
      )}
    />
  );
}

/** Green check in a tinted disc; springs in (the "confirmation" move). `delay` is a CSS time. */
export function OkDot({ size = 24, delay }: { size?: number; delay?: string }) {
  return (
    <span
      className="grid flex-none animate-ob-check place-items-center rounded-full bg-brand-tint text-brand-text motion-reduce:animate-none"
      style={{ width: size, height: size, ['--d' as string]: delay }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
    </span>
  );
}

/** Two-letter tile for a tool ("CC", "NEO"). The text is a visual badge only; the row carries the accessible name. */
export function ToolTile({ children, size = 34 }: { children: ReactNode; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid flex-none place-items-center rounded-[10px] bg-hover font-mono text-[11px] font-semibold text-ink"
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

/** Cap's round avatar in chat. */
export function CapAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center overflow-hidden rounded-full border border-line bg-panel"
      style={{ width: size, height: size }}
    >
      <CapDartArt size={size} />
    </span>
  );
}

export const PRESS = 'active:scale-[0.97] motion-reduce:active:scale-100';
/** The one button that is the next step gets the halo. */
export const HALO = 'animate-ob-halo motion-reduce:animate-none';
