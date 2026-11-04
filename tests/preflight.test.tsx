import { describe, expect, it } from 'vitest';
import { evaluatePreflight } from '../src/renderer/src/features/dashboard/upnext/preflight';

describe('Issue #197: Preflight checks before run start', () => {
  it('disables start when Claude is not confirmed', () => {
    const result = evaluatePreflight({ confirmed: false, status: 'ready' }, { reachable: true });
    expect(result.canStart).toBe(false);
    expect(result.reason).toContain('Claude is not confirmed');
  });

  it('disables start when Claude is not installed', () => {
    const result = evaluatePreflight({ confirmed: true, status: 'tool_not_installed' }, { reachable: true });
    expect(result.canStart).toBe(false);
    expect(result.reason).toContain('Claude is not installed');
  });

  it('disables start when Claude is not logged in', () => {
    const result = evaluatePreflight({ confirmed: true, status: 'not_logged_in' }, { reachable: true });
    expect(result.canStart).toBe(false);
    expect(result.reason).toContain('Claude is not signed in');
  });

  it('disables start when Claude API key is required', () => {
    const result = evaluatePreflight({ confirmed: true, status: 'api_key_required' }, { reachable: true });
    expect(result.canStart).toBe(false);
    expect(result.reason).toContain('Claude API key is required');
  });

  it('disables start when browser is unreachable', () => {
    const result = evaluatePreflight(
      { confirmed: true, status: 'ready' },
      { reachable: false, reason: 'Browser is unreachable.' },
    );
    expect(result.canStart).toBe(false);
    expect(result.reason).toBe('Browser is unreachable.');
  });

  it('allows start when agent is confirmed ready and browser is reachable', () => {
    const result = evaluatePreflight({ confirmed: true, status: 'ready' }, { reachable: true });
    expect(result.canStart).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
