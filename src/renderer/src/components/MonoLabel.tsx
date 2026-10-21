import type { CSSProperties, ReactNode } from 'react';

const BASE: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10.5,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  whiteSpace: 'nowrap',
};

/** Small uppercase mono label (section captions, state tags). `style` overrides the board defaults. */
export function MonoLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={style ? { ...BASE, ...style } : BASE}>{children}</span>;
}
