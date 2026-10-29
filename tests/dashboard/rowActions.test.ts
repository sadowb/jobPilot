import { describe, expect, it } from 'vitest';
import {
  cancellableRuns,
  rowRunActions,
  runErrorMessage,
} from '../../src/renderer/src/features/dashboard/upnext/rowActions';

const run = (id: string, applicationId: string, status: 'queued' | 'running' | 'cancelled' | 'needs_you') => ({
  id,
  applicationId,
  status,
  startedAt: null,
  finishedAt: null,
});

describe('rowRunActions', () => {
  it('offers Start only on queued rows, Cancel on running or waiting rows, nothing when held', () => {
    expect(rowRunActions({ stage: 'queued' })).toEqual(['start']);
    expect(rowRunActions({ stage: 'running' })).toEqual(['cancel']);
    expect(rowRunActions({ stage: 'waiting' })).toEqual(['cancel']);
    expect(rowRunActions({ stage: 'held' })).toEqual([]);
  });
});

describe('cancellableRuns', () => {
  it('maps each application to its latest cancellable run (list is newest first)', () => {
    const map = cancellableRuns([
      run('r3', 'a', 'cancelled'),
      run('r2', 'a', 'needs_you'),
      run('r1', 'a', 'running'),
      run('r4', 'b', 'queued'),
    ]);
    expect([...map]).toEqual([['a', 'r2']]);
    expect(cancellableRuns(undefined).size).toBe(0);
  });
});

describe('runErrorMessage', () => {
  it('strips the Electron IPC wrapper and falls back when empty', () => {
    expect(
      runErrorMessage(
        new Error(
          "Error invoking remote method 'runs:start': Error: Confirm this unverified page before starting a run.",
        ),
        'x',
      ),
    ).toBe('Confirm this unverified page before starting a run.');
    // Pre-fix main sent the class name; stripped here too so an older wrapper never shows it.
    expect(
      runErrorMessage(new Error("Error invoking remote method 'runs:start': UserFacingError: Confirm first."), 'x'),
    ).toBe('Confirm first.');
    expect(runErrorMessage('boom', 'Could not start the run.')).toBe('Could not start the run.');
  });
});
