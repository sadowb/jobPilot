import { describe, expect, it } from 'vitest';
import { hasLiveRun } from '../src/renderer/src/features/settings/liveRun';
import {
  EMPTY_DRAFT,
  applyFacts,
  linkedinUrl,
  parseCareer,
  rejectedFacts,
} from '../src/renderer/src/features/onboarding/draft';

describe('rejected chat facts (#235)', () => {
  it('reports a fictional 555 number instead of dropping it silently', () => {
    const facts = [{ kind: 'personal', field: 'phone', value: '+1 555 010 0199' }] as const;
    expect(applyFacts(EMPTY_DRAFT, facts).personal.phone).toBe('');
    const [rejected] = rejectedFacts(facts);
    expect(rejected?.key).toBe('phone');
    expect(rejected?.message).toContain('not a valid number');
  });

  it('accepts and stores a valid phone and a LinkedIn profile', () => {
    const facts = [
      { kind: 'personal', field: 'phone', value: '+212 612 345 678' },
      { kind: 'personal', field: 'linkedin', value: 'linkedin.com/in/sara-benali-example' },
    ] as const;
    expect(rejectedFacts(facts)).toEqual([]);
    const { personal } = applyFacts(EMPTY_DRAFT, facts);
    expect(personal.phone).toBe('+212612345678');
    expect(personal.linkedin).toBe('https://linkedin.com/in/sara-benali-example');
  });

  it('rejects a LinkedIn value that is not a profile URL', () => {
    expect(linkedinUrl('https://example.com/sara')).toBeNull();
    const [rejected] = rejectedFacts([{ kind: 'personal', field: 'linkedin', value: 'my profile' }]);
    expect(rejected?.key).toBe('linkedin');
  });
});

describe('CV work history (#235)', () => {
  it('keeps year-only dates and open-ended roles, and reports unreadable ones', () => {
    const { kept, dropped } = parseCareer([
      { role: 'Engineer', organisation: 'Acme', start: '2019', end: '2021' },
      { role: 'Lead', organisation: 'Globex', start: '2021-03', end: 'Present' },
      { role: 'Intern', organisation: 'Initech', start: 'last summer', end: '' },
    ]);
    expect(kept.map((j) => [j.start, j.end])).toEqual([
      ['2019-01', '2021-12'],
      ['2021-03', 'present'],
    ]);
    expect(dropped).toEqual(['Intern at Initech']);
  });
});

describe('Settings revoke confirm (#240)', () => {
  it('treats queued, running and waiting runs as live, finished ones as not', () => {
    expect(hasLiveRun(undefined)).toBe(false);
    expect(hasLiveRun([{ status: 'submitted' }, { status: 'failed' }, { status: 'cancelled' }])).toBe(false);
    for (const status of ['queued', 'running', 'needs_you', 'owner_in_control', 'awaiting_approval'] as const)
      expect(hasLiveRun([{ status }])).toBe(true);
  });
});
