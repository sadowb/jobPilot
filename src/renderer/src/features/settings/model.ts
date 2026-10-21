export const CREW_MIN = 1;
export const CREW_MAX = 32;
export const CREW_TICKS = [1, 8, 16, 24, 32] as const;

export type SubmitMode = 'review' | 'auto';
export type SiteMode = 'auto' | 'assisted' | 'manual';

export interface Limits {
  openTabs: number;
  costPerDay: number;
  runSeconds: number;
  stuckSeconds: number;
}

export interface LimitSpec {
  key: keyof Limits;
  label: string;
  prefix?: string;
  unit: string;
  min: number;
  max: number;
}

/** Bounds are validation choices of this frontend; the V17 boards only draw the default values. */
export const LIMIT_SPECS: readonly LimitSpec[] = [
  { key: 'openTabs', label: 'Open tabs', unit: 'tabs at once', min: 1, max: 32 },
  { key: 'costPerDay', label: 'Cost limit', prefix: '$', unit: 'per day', min: 1, max: 1000 },
  { key: 'runSeconds', label: 'Run time', unit: 'seconds', min: 30, max: 3600 },
  { key: 'stuckSeconds', label: 'Stuck after', unit: 'seconds', min: 30, max: 3600 },
];

/** Rounds into [min, max]; NaN and infinities fall back to `min` so bad input can never reach the UI. */
export const clampInt = (value: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;

export const clampCrew = (value: number): number => clampInt(value, CREW_MIN, CREW_MAX);

/** Position of a crew size along the slider track, 0 to 100. */
export function crewPercent(value: number): number {
  return ((clampCrew(value) - CREW_MIN) / (CREW_MAX - CREW_MIN)) * 100;
}

/** Tick label anchoring: the first hangs right of its tick, the last left of it, the rest are centred. */
export function tickTransform(tick: number): string {
  if (tick === CREW_MIN) return 'translateX(0)';
  return tick === CREW_MAX ? 'translateX(-100%)' : 'translateX(-50%)';
}

/** Parses a limit typed by the user. Non-numeric input keeps the previous value; numbers are clamped into range. */
export function parseLimit(raw: string, spec: Pick<LimitSpec, 'min' | 'max'>, previous: number): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits === '') return previous;
  return clampInt(Number(digits), spec.min, spec.max);
}

/** Autopilot caption under the switch. The busy count, time left and change date are sample data. */
export function autopilotStatus(on: boolean, crew: number): string {
  return on
    ? `On · Crew 2 / ${clampCrew(crew)} busy · ~1 h 05 left · set by you, Oct 14`
    : 'Off · nothing starts without you';
}

/** The bits of a DOM event target the shortcut check reads (kept structural so this module stays DOM-free). */
interface TargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

export interface KeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: unknown;
}

/** True when a key event came from a field the user is typing into (so single-key shortcuts must not fire). */
export function isTypingTarget(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) return false;
  const el = target as TargetLike;
  if (el.isContentEditable) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

/** The ',' shortcut opens settings: bare key only, never while typing, never with a modifier. */
export function isSettingsShortcut(e: KeyEventLike): boolean {
  return e.key === ',' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target);
}
