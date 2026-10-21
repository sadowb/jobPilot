import type { CSSProperties } from 'react';

/** Style object that carries CSS custom properties (`--d`, `--dur`), which React's CSSProperties type does not list. */
export function cssVars(vars: Record<`--${string}`, string>, style: CSSProperties = {}): CSSProperties {
  return { ...style, ...vars } as CSSProperties;
}
