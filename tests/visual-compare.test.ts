import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
// @ts-expect-error plain ESM module without type declarations
import { comparePngs } from '../scripts/visual/compare.mjs';

interface Result {
  status: 'PASS' | 'FAIL';
  reason: string;
  changed: number;
  total: number;
  ratio: number;
  diff: PNG | null;
}
const compare = comparePngs as (a: PNG, b: PNG, o?: { threshold?: number }) => Result;

function solid(width: number, height: number, rgb: [number, number, number] = [255, 255, 255]): PNG {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) png.data.set([...rgb, 255], i * 4);
  return png;
}

describe('visual comparePngs', () => {
  it('reports identical images as 0% changed', () => {
    const r = compare(solid(10, 10), solid(10, 10));
    expect(r).toMatchObject({ status: 'PASS', changed: 0, total: 100, ratio: 0 });
  });

  it('counts one changed pixel exactly', () => {
    const head = solid(10, 10);
    head.data.set([0, 0, 0, 255], 0);
    const r = compare(solid(10, 10), head, { threshold: 0 });
    expect(r.changed).toBe(1);
    expect(r.ratio).toBeCloseTo(0.01, 10);
    expect(r.status).toBe('FAIL');
    expect(r.diff).not.toBeNull();
  });

  it('fails with a reason, and does not throw, on a size mismatch', () => {
    const r = compare(solid(10, 10), solid(10, 12));
    expect(r.status).toBe('FAIL');
    expect(r.reason).toContain('10x10');
    expect(r.reason).toContain('10x12');
    expect(r.diff).toBeNull();
  });

  it('passes at exactly the threshold and fails just above it', () => {
    const head = solid(10, 10);
    head.data.set([0, 0, 0, 255], 0);
    expect(compare(solid(10, 10), head, { threshold: 0.01 }).status).toBe('PASS');
    expect(compare(solid(10, 10), head, { threshold: 0.0099 }).status).toBe('FAIL');
  });
});
