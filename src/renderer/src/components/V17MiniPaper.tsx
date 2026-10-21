import type { CSSProperties } from 'react';

/**
 * The CV "paper": always the light palette, even in dark mode, because it depicts a printed page.
 * The V17 boards pin these tokens inline on the sheet; this is the one place that does it.
 */
export const PAPER_TOKENS = {
  '--bg': 'rgb(255 255 255)',
  '--panel': 'rgb(246 244 240)',
  '--ink': 'rgb(21 26 21)',
  '--ink-2': 'rgb(58 65 55)',
  '--muted': 'rgb(94 90 80)',
  '--line': 'rgb(228 224 214)',
  '--line-2': 'rgb(168 163 144)',
  '--brand': 'rgb(70 80 63)',
  '--brand-tint': 'rgb(236 239 230)',
} as CSSProperties;

const bar = (width: string, height: number, background: string, marginTop: number): CSSProperties => ({
  display: 'block',
  flex: 'none',
  width,
  height,
  background,
  borderRadius: 2,
  marginTop,
});

/** 64×82 thumbnail of a one-page CV (peek panel). */
export function V17MiniPaper() {
  return (
    <div
      aria-hidden="true"
      style={{
        ...PAPER_TOKENS,
        color: 'var(--ink)',
        width: 64,
        height: 82,
        flex: 'none',
        boxSizing: 'border-box',
        padding: 8,
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: 6,
        boxShadow: 'var(--float)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <i style={bar('58%', 5, 'var(--ink)', 0)} />
      <i style={bar('86%', 2, 'var(--line-2)', 5)} />
      <i style={bar('66%', 2, 'var(--line-2)', 3)} />
      <i style={bar('30%', 3, 'var(--brand)', 10)} />
      <i style={bar('96%', 2, 'var(--line)', 5)} />
      <i style={bar('90%', 2, 'var(--line)', 3)} />
      <i style={bar('84%', 2, 'var(--line)', 3)} />
      <i style={bar('30%', 3, 'var(--brand)', 9)} />
      <i style={bar('96%', 2, 'var(--line)', 5)} />
      <i style={bar('78%', 2, 'var(--line)', 3)} />
      <i style={bar('92%', 2, 'var(--line)', 3)} />
    </div>
  );
}
