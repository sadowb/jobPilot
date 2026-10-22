import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/** @typedef {{ status: 'PASS' | 'FAIL', reason: string, changed: number, total: number, ratio: number, diff: PNG | null }} Comparison */

/** Share of changed pixels above which a screen fails (0.1%). */
export const DEFAULT_THRESHOLD = 0.001;

/**
 * Compare two decoded PNGs. Never throws for mismatched sizes: that is a FAIL with a reason.
 * @param {PNG} base
 * @param {PNG} head
 * @param {{ threshold?: number, pixelmatchThreshold?: number }} [options]
 * @returns {Comparison}
 */
export function comparePngs(base, head, options = {}) {
  const { threshold = DEFAULT_THRESHOLD, pixelmatchThreshold = 0.1 } = options;
  if (base.width !== head.width || base.height !== head.height) {
    return {
      status: 'FAIL',
      reason: `size mismatch: base ${base.width}x${base.height}, head ${head.width}x${head.height}`,
      changed: 0,
      total: 0,
      ratio: 1,
      diff: null,
    };
  }
  const { width, height } = base;
  const total = width * height;
  const diff = new PNG({ width, height });
  const changed = pixelmatch(base.data, head.data, diff.data, width, height, {
    threshold: pixelmatchThreshold,
    includeAA: false,
  });
  const ratio = total === 0 ? 0 : changed / total;
  const failed = ratio > threshold;
  return {
    status: failed ? 'FAIL' : 'PASS',
    reason: failed ? `${(ratio * 100).toFixed(3)}% of pixels changed (limit ${(threshold * 100).toFixed(3)}%)` : '',
    changed,
    total,
    ratio,
    diff,
  };
}
