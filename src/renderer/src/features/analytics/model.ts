/** Pure chart and ratio maths for the Analytics screen. */

/** Whole-percent rate, rounded half up; 0 when there is nothing to divide by. */
export function ratePercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export interface FunnelStage {
  label: string;
  value: number;
  /** Right-aligned caption, e.g. "11% of applied". */
  note: string;
}

export interface FunnelBar extends FunnelStage {
  y: number;
  width: number;
  labelX: number;
}

export const FUNNEL = { trackX: 124, trackWidth: 280, rowHeight: 22, rowStep: 42, top: 8 } as const;

/** Bars are scaled against the first stage; later stages can never exceed the track. */
export function funnelBars(stages: readonly FunnelStage[]): FunnelBar[] {
  const base = stages[0]?.value ?? 0;
  return stages.map((s, i) => {
    const width = base > 0 ? Math.min(FUNNEL.trackWidth, (s.value / base) * FUNNEL.trackWidth) : 0;
    return {
      ...s,
      y: FUNNEL.top + i * FUNNEL.rowStep,
      width,
      labelX: FUNNEL.trackX + (s.value === 0 ? FUNNEL.trackWidth : width) + 8,
    };
  });
}

export const LINE = { left: 30, step: 88, baseline: 160, perPoint: 11.5, labelRise: 12 } as const;

export interface LinePoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

export function linePoints(values: readonly number[], labels: readonly string[]): LinePoint[] {
  return values.map((value, i) => ({
    x: LINE.left + i * LINE.step,
    y: LINE.baseline - value * LINE.perPoint,
    value,
    label: labels[i] ?? '',
  }));
}

export interface RateRow {
  name: string;
  applied: number;
  replies: number;
  /** The row Cap's read is about: drawn in --ink / --brand instead of the neutral tone. */
  highlight?: boolean;
}

/** Reply-rate bars are drawn at 5x the percentage so a 20% rate fills the track. */
export function rateBarWidth(percent: number): number {
  return Math.max(0, Math.min(100, percent * 5));
}
