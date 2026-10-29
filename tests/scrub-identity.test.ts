import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }));

import { scrub, scrubIdentity } from '../src/main/modules/observability/log.service';

const home = '/Users/example';

describe('diagnostics identity scrub', () => {
  it('replaces the home directory with ~ and the username with <user>, including crash-dump paths', () => {
    const line = `{"crash_dumps":"${home}/Library/Application Support/JobPilot/crashes","owner":"example"}`;
    const out = scrubIdentity(line, home, 'example');
    expect(out).toBe('{"crash_dumps":"~/Library/Application Support/JobPilot/crashes","owner":"<user>"}');
    expect(out).not.toContain('example');
  });

  it('handles the JSON-escaped form of a Windows home path', () => {
    const win = 'C:\\Users\\example';
    expect(scrubIdentity(JSON.stringify({ p: `${win}\\AppData` }), win, 'example')).toBe('{"p":"~\\\\AppData"}');
  });

  it('does not mangle words that merely contain a short username', () => {
    expect(scrubIdentity('panel to ab', '/Users/ab', 'ab')).toBe('panel to ab');
    expect(scrubIdentity('examples and counterexample', home, 'example')).toBe('examples and counterexample');
  });

  it('scrub() applies it to every logged string', () => {
    const out = scrub({ crash_dumps: `${process.env.HOME ?? ''}/crashes` });
    expect(JSON.stringify(out)).not.toContain(process.env.HOME ?? '\0');
  });
});
