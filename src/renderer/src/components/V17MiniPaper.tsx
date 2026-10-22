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

// Bars: [width, height, colour, top margin] of the CV's placeholder lines.
const BARS = [
  'mt-0 h-[5px] w-[58%] bg-ink',
  'mt-[5px] h-0.5 w-[86%] bg-line-2',
  'mt-[3px] h-0.5 w-[66%] bg-line-2',
  'mt-2.5 h-[3px] w-[30%] bg-brand',
  'mt-[5px] h-0.5 w-[96%] bg-line',
  'mt-[3px] h-0.5 w-[90%] bg-line',
  'mt-[3px] h-0.5 w-[84%] bg-line',
  'mt-[9px] h-[3px] w-[30%] bg-brand',
  'mt-[5px] h-0.5 w-[96%] bg-line',
  'mt-[3px] h-0.5 w-[78%] bg-line',
  'mt-[3px] h-0.5 w-[92%] bg-line',
];

/** 64×82 thumbnail of a one-page CV (peek panel). */
export function V17MiniPaper() {
  return (
    <div
      aria-hidden="true"
      className="box-border flex h-[82px] w-16 flex-none flex-col overflow-hidden rounded-md border border-line bg-bg p-2 text-ink shadow-float"
      style={PAPER_TOKENS}
    >
      {BARS.map((bar, i) => (
        <i key={i} className={`block flex-none rounded-xs ${bar}`} />
      ))}
    </div>
  );
}
