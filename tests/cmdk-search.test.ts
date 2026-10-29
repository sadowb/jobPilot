import { describe, expect, it } from 'vitest';
import { SAMPLE_JOBS } from '../src/renderer/src/features/cmdk/jobs';
import {
  answerFor,
  buildResults,
  flatten,
  matchJobs,
  moveIndex,
  parseStatusCommand,
} from '../src/renderer/src/features/cmdk/search';

describe('parseStatusCommand', () => {
  it('parses set/move/mark', () => {
    expect(parseStatusCommand('set ramp to interview')).toEqual({ companyQuery: 'ramp', status: 'Interview' });
    expect(parseStatusCommand('  Move  Ramp   to  REJECTED ')).toEqual({ companyQuery: 'ramp', status: 'Rejected' });
    expect(parseStatusCommand('mark linear as withdrawn')?.status).toBe('Withdrawn');
  });

  it('accepts a unique status prefix, rejects ambiguous or unknown ones', () => {
    expect(parseStatusCommand('set ramp to int')?.status).toBe('Interview');
    expect(parseStatusCommand('set ramp to s')?.status).toBe('Submitted'); // Screening is not settable
    expect(parseStatusCommand('set ramp to screening')).toBeNull();
    expect(parseStatusCommand('set ramp to nonsense')).toBeNull();
    expect(parseStatusCommand('ramp interview')).toBeNull();
  });
});

describe('matchJobs', () => {
  it('ranks exact, prefix, then substring, and matches role text last', () => {
    expect(matchJobs('ramp', SAMPLE_JOBS)[0]?.id).toBe('ramp');
    expect(matchJobs('p', SAMPLE_JOBS)[0]?.company.toLowerCase().startsWith('p')).toBe(true);
    expect(matchJobs('abuse', SAMPLE_JOBS).map((j) => j.id)).toEqual(['stripe']);
    expect(matchJobs('   ', SAMPLE_JOBS)).toEqual([]);
  });
});

describe('buildResults', () => {
  it('the V17 command: Actions, Jobs, Ask Cap, with the status change in Actions', () => {
    const sections = buildResults('set ramp to interview', SAMPLE_JOBS);
    expect(sections.map((s) => s.label)).toEqual(['Actions', 'Jobs', 'Ask Cap']);
    expect(sections[0]!.results).toHaveLength(1);
    expect(sections[0]!.results[0]).toMatchObject({
      title: 'Set Ramp → Interview',
      subtitle: 'Screening · got contacted → Interview · follow-up Mon Oct 26',
      intent: { type: 'set-status', jobId: 'ramp', status: 'Interview' },
      hint: '↵',
    });
    expect(sections[1]!.results[0]).toMatchObject({ title: 'Ramp · Software Engineer, New Grad' });
    expect(sections[2]!.results[0]).toMatchObject({ title: '“set ramp to interview”', hint: '⇥' });
  });

  it('does not offer a no-op status change', () => {
    const titles = flatten(buildResults('set perpay to rejected', SAMPLE_JOBS)).map((r) => r.title);
    expect(titles).not.toContain('Set Perpay → Rejected');
  });

  it('offers no action that nothing backs: a plain query is jobs + ask, no match leaves only Ask Cap', () => {
    expect(buildResults('notion', SAMPLE_JOBS).map((s) => s.label)).toEqual(['Jobs', 'Ask Cap']);
    expect(buildResults('zzzz', SAMPLE_JOBS).map((s) => s.label)).toEqual(['Ask Cap']);
  });

  it('an empty box lists recent jobs only', () => {
    const sections = buildResults('  ', SAMPLE_JOBS);
    expect(sections.map((s) => s.label)).toEqual(['Jobs']);
    expect(sections[0]!.results).toHaveLength(3);
  });
});

describe('moveIndex', () => {
  it('wraps both ways and survives an empty list', () => {
    expect(moveIndex(0, -1, 4)).toBe(3);
    expect(moveIndex(3, 1, 4)).toBe(0);
    expect(moveIndex(0, 1, 0)).toBe(0);
  });
});

describe('answerFor', () => {
  it('explains the Ramp status change exactly as the board does', () => {
    const a = answerFor('set ramp to interview', SAMPLE_JOBS);
    expect(a?.meta).toBe('answer · read the Ramp record and 2 emails');
    expect(a?.intro).toBe(
      'I can set Ramp to Interview. Its record has sat at Screening since Oct 19, when Dana emailed to set up a recruiter call. This is what would change:',
    );
    expect(a?.rows.map((r) => r.label)).toEqual(['Status', 'Follow-up', 'Dashboard']);
    expect(a?.primary).toEqual({
      label: 'Set to Interview',
      intent: { type: 'set-status', jobId: 'ramp', status: 'Interview' },
    });
  });

  it('returns null for anything it cannot honestly answer', () => {
    expect(answerFor('why was perpay rejected', SAMPLE_JOBS)).toBeNull();
    expect(answerFor('set nobody to interview', SAMPLE_JOBS)).toBeNull();
    expect(answerFor('set perpay to rejected', SAMPLE_JOBS)).toBeNull();
  });

  it('drops the follow-up row when the record has none', () => {
    const a = answerFor('set linear to interview', SAMPLE_JOBS);
    expect(a?.rows.map((r) => r.label)).toEqual(['Status', 'Dashboard']);
  });
});
