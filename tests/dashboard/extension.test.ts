import { describe, expect, it } from 'vitest';
import {
  initialPopupState,
  isSelectable,
  popupReducer,
  SAMPLE_SCAN,
} from '../../src/renderer/src/features/dashboard/extension/model';

const reduce = popupReducer(SAMPLE_SCAN);

describe('extension popup', () => {
  it('starts with the matching, not-yet-applied links ticked (3 of 6)', () => {
    expect(initialPopupState().ticked).toEqual(['backend', 'data', 'payments']);
  });
  it('locks applied jobs whatever the filter says', () => {
    const applied = SAMPLE_SCAN.links[0]!;
    expect(isSelectable(applied, true)).toBe(false);
    expect(isSelectable(applied, false)).toBe(false);
    expect(reduce(initialPopupState(), { type: 'toggle', id: applied.id })).toEqual(initialPopupState());
  });
  it('excludes filtered links while "Match my roles" is on, and allows them when it is off', () => {
    const staff = SAMPLE_SCAN.links.find((l) => l.id === 'staff')!;
    expect(isSelectable(staff, true)).toBe(false);
    expect(isSelectable(staff, false)).toBe(true);
    const off = reduce(initialPopupState(), { type: 'match', on: false });
    expect(reduce(off, { type: 'toggle', id: 'staff' }).ticked).toContain('staff');
  });
  it('turning the filter back on unticks what it excludes', () => {
    let s = reduce(initialPopupState(), { type: 'match', on: false });
    s = reduce(s, { type: 'all' });
    expect(s.ticked).toEqual(['backend', 'data', 'payments', 'staff', 'ae']);
    s = reduce(s, { type: 'match', on: true });
    expect(s.ticked).toEqual(['backend', 'data', 'payments']);
  });
  it('ALL selects only selectable links; NONE clears', () => {
    expect(reduce(initialPopupState(), { type: 'all' }).ticked).toEqual(['backend', 'data', 'payments']);
    expect(reduce(initialPopupState(), { type: 'none' }).ticked).toEqual([]);
  });
  it('sends only ticked links, and sending nothing is a no-op', () => {
    const sent = reduce(initialPopupState(), { type: 'send' });
    expect(sent.sent?.map((l) => l.id)).toEqual(['backend', 'data', 'payments']);
    expect(sent.ticked).toEqual([]);
    const none = reduce(initialPopupState(), { type: 'none' });
    expect(reduce(none, { type: 'send' })).toBe(none);
  });
});
