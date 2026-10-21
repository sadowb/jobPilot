import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../src/renderer/src/lib/theme-state';

describe('appearance preference', () => {
  it('follows the system only when System is selected', () => {
    expect(resolveTheme('system', true)).toEqual({ source: 'system', dark: true });
    expect(resolveTheme('system', false)).toEqual({ source: 'system', dark: false });
    expect(resolveTheme('light', true)).toEqual({ source: 'light', dark: false });
    expect(resolveTheme('dark', false)).toEqual({ source: 'dark', dark: true });
  });
});
