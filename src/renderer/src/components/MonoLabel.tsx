import type { CSSProperties, ReactNode } from 'react';

/** Small uppercase mono label (section captions, state tags). `style` overrides the board defaults. */
export function MonoLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="font-mono text-[10.5px] tracking-[.06em] whitespace-nowrap text-muted uppercase" style={style}>
      {children}
    </span>
  );
}
