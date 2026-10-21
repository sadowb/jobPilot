import { describe, expect, it } from 'vitest';
import { BREAKDOWNS, FUNNEL_STAGES, WEEKLY_REPLY_RATE, WEEKS } from '../src/renderer/src/features/analytics/data';
import { funnelBars, linePoints, rateBarWidth, ratePercent } from '../src/renderer/src/features/analytics/model';
import { INITIAL_FACTS } from '../src/renderer/src/features/profile/data';
import { confirmedTotal, factsReducer } from '../src/renderer/src/features/profile/model';

describe('analytics maths', () => {
  it('rounds reply rates half up and survives an empty denominator', () => {
    expect(ratePercent(7, 62)).toBe(11);
    expect(ratePercent(1, 8)).toBe(13);
    expect(ratePercent(0, 17)).toBe(0);
    expect(ratePercent(3, 0)).toBe(0);
  });

  it('reproduces the board funnel geometry', () => {
    const [applied, reply, interview, offer] = funnelBars(FUNNEL_STAGES);
    expect(applied?.width).toBe(280);
    expect(reply?.width.toFixed(1)).toBe('31.6');
    expect(interview?.width.toFixed(1)).toBe('4.5');
    expect(reply?.labelX.toFixed(1)).toBe('163.6');
    expect(offer?.labelX).toBe(412); // empty stage is drawn as a full dashed track
    expect([applied, reply, interview, offer].map((b) => b?.y)).toEqual([8, 50, 92, 134]);
  });

  it('never lets a stage exceed the track', () => {
    const bars = funnelBars([
      { label: 'a', value: 10, note: '' },
      { label: 'b', value: 50, note: '' },
    ]);
    expect(bars[1]?.width).toBe(280);
  });

  it('reproduces the reply-rate line coordinates', () => {
    const pts = linePoints(WEEKLY_REPLY_RATE, WEEKS);
    expect(pts[0]).toMatchObject({ x: 30, y: 114 });
    expect(pts[7]).toMatchObject({ x: 646, y: 33.5, label: 'Oct 13' });
  });

  it('draws reply-rate bars at 5x and clamps', () => {
    expect(rateBarWidth(16)).toBe(80);
    expect(rateBarWidth(0)).toBe(0);
    expect(rateBarWidth(40)).toBe(100);
  });

  it('derives the sample table percentages shown on the board', () => {
    const pct = BREAKDOWNS.flatMap((b) => b.rows.map((r) => ratePercent(r.replies, r.applied)));
    expect(pct).toEqual([16, 17, 13, 0, 14, 8, 13, 9, 13]);
  });
});

describe('profile facts reducer', () => {
  const first = INITIAL_FACTS.review[0]!;

  it('moves a confirmed fact to the confirmed list and counts it', () => {
    const next = factsReducer(INITIAL_FACTS, { type: 'confirm', id: first.id });
    expect(next.review).toHaveLength(2);
    expect(next.confirmed[0]).toBe(first);
    expect(confirmedTotal(next)).toBe(28);
  });

  it('drops a rejected fact without confirming it', () => {
    const next = factsReducer(INITIAL_FACTS, { type: 'reject', id: first.id });
    expect(next.review.map((f) => f.id)).not.toContain(first.id);
    expect(confirmedTotal(next)).toBe(27);
  });

  it('ignores unknown or repeated ids', () => {
    const once = factsReducer(INITIAL_FACTS, { type: 'confirm', id: first.id });
    expect(factsReducer(once, { type: 'confirm', id: first.id })).toBe(once);
    expect(factsReducer(INITIAL_FACTS, { type: 'reject', id: 'nope' })).toBe(INITIAL_FACTS);
  });
});
