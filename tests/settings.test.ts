import { describe, expect, it } from 'vitest';
import {
  CREW_MAX,
  CREW_MIN,
  CREW_TICKS,
  LIMIT_SPECS,
  autopilotStatus,
  clampCrew,
  crewPercent,
  isSettingsShortcut,
  type KeyEventLike,
  parseLimit,
  tickTransform,
} from '../src/renderer/src/features/settings/model';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../src/main/platform/db/schema';
import type { JobPilotDb } from '../src/main/platform/db/database';
import { AppSettingsSchema, UpdateSettingsSchema } from '../src/shared/dto';
import { applyConcurrency, getSettings, updateSettings } from '../src/main/modules/settings/settings.service';
import * as queueModule from '../src/renderer/src/features/dashboard/upnext/queue';

const key = (over: Partial<KeyEventLike> = {}): KeyEventLike => ({
  key: ',',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  target: null,
  ...over,
});

describe('crew slider maths', () => {
  it('clamps and rounds into 1..32', () => {
    expect(clampCrew(0)).toBe(CREW_MIN);
    expect(clampCrew(99)).toBe(CREW_MAX);
    expect(clampCrew(4.4)).toBe(4);
    expect(clampCrew(Number.NaN)).toBe(CREW_MIN);
  });

  it('places the board values on the track (4 of 32 is 9.68%)', () => {
    expect(crewPercent(4).toFixed(2)).toBe('9.68');
    expect(crewPercent(1)).toBe(0);
    expect(crewPercent(32)).toBe(100);
    expect(CREW_TICKS.map((t) => crewPercent(t).toFixed(2))).toEqual(['0.00', '22.58', '48.39', '74.19', '100.00']);
  });

  it('anchors first and last tick labels inside the track', () => {
    expect(tickTransform(1)).toBe('translateX(0)');
    expect(tickTransform(16)).toBe('translateX(-50%)');
    expect(tickTransform(32)).toBe('translateX(-100%)');
  });
});

describe('limit parsing', () => {
  const tabs = LIMIT_SPECS.find((s) => s.key === 'openTabs')!;
  const run = LIMIT_SPECS.find((s) => s.key === 'runSeconds')!;

  it('keeps the previous value for non-numeric input', () => {
    expect(parseLimit('', tabs, 8)).toBe(8);
    expect(parseLimit('abc', tabs, 8)).toBe(8);
  });

  it('strips non-digits and clamps into range', () => {
    expect(parseLimit('$12', tabs, 8)).toBe(12);
    expect(parseLimit('0', tabs, 8)).toBe(tabs.min);
    expect(parseLimit('999', tabs, 8)).toBe(tabs.max);
    expect(parseLimit('10', run, 540)).toBe(run.min);
  });
});

describe('autopilot caption', () => {
  it('reflects the switch and the crew size', () => {
    expect(autopilotStatus(true, 4)).toContain('Crew 2 / 4 busy');
    expect(autopilotStatus(true, 99)).toContain('/ 32 busy');
    expect(autopilotStatus(false, 4)).toMatch(/^Off/);
  });
});

describe('settings shortcut', () => {
  it('fires on a bare comma', () => {
    expect(isSettingsShortcut(key())).toBe(true);
  });

  it('ignores other keys and modified commas', () => {
    expect(isSettingsShortcut(key({ key: 'a' }))).toBe(false);
    expect(isSettingsShortcut(key({ metaKey: true }))).toBe(false);
    expect(isSettingsShortcut(key({ ctrlKey: true }))).toBe(false);
    expect(isSettingsShortcut(key({ altKey: true }))).toBe(false);
  });

  it('never fires while typing in a field', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(isSettingsShortcut(key({ target: { tagName, isContentEditable: false } }))).toBe(false);
    }
    expect(isSettingsShortcut(key({ target: { tagName: 'DIV', isContentEditable: true } }))).toBe(false);
    expect(isSettingsShortcut(key({ target: { tagName: 'BUTTON', isContentEditable: false } }))).toBe(true);
  });
});

describe('settings IPC validation', () => {
  it('validates ranges and rejects out-of-bounds values', () => {
    expect(() => UpdateSettingsSchema.parse({ crew: 0 })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ crew: 33 })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ crew: -5 })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ crew: 1.5 })).toThrow();
    expect(UpdateSettingsSchema.parse({ crew: 1 }).crew).toBe(1);
    expect(UpdateSettingsSchema.parse({ crew: 32 }).crew).toBe(32);

    expect(() => UpdateSettingsSchema.parse({ limits: { openTabs: 0 } })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ limits: { openTabs: 33 } })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ limits: { costPerDay: 0 } })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ limits: { costPerDay: 1001 } })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ limits: { runSeconds: 29 } })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ limits: { runSeconds: 3601 } })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ limits: { stuckSeconds: 29 } })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ limits: { stuckSeconds: 3601 } })).toThrow();

    expect(() => UpdateSettingsSchema.parse({ submitMode: 'invalid' as never })).toThrow();
    expect(UpdateSettingsSchema.parse({ submitMode: 'review' }).submitMode).toBe('review');
    expect(UpdateSettingsSchema.parse({ submitMode: 'auto' }).submitMode).toBe('auto');
  });

  it('defaults autopilot to off', () => {
    expect(AppSettingsSchema.parse({}).autopilot).toBe(false);
  });
});

describe('settings persistence and queue concurrency reuse', () => {
  function makeTestDb(): JobPilotDb {
    const sqlite = new Database(':memory:');
    sqlite.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);');
    return drizzle(sqlite, { schema }) as JobPilotDb;
  }

  it('reads defaults when empty and persists modifications across re-reads', () => {
    const testDb = makeTestDb();
    const defaults = getSettings(testDb);
    expect(defaults).toEqual({
      autopilot: false,
      crew: 6,
      submitMode: 'review',
      sites: {},
      limits: { openTabs: 8, costPerDay: 5, runSeconds: 540, stuckSeconds: 120 },
    });

    const updated = updateSettings({ crew: 30 }, testDb);
    expect(updated.crew).toBe(30);

    expect(applyConcurrency(testDb)).toBe(30);

    const updatedLimits = updateSettings({ limits: { costPerDay: 50 } }, testDb);
    expect(updatedLimits.limits).toEqual({
      openTabs: 8,
      costPerDay: 50,
      runSeconds: 540,
      stuckSeconds: 120,
    });

    updateSettings({ submitMode: 'auto', autopilot: true }, testDb);

    const fresh = getSettings(testDb);
    expect(fresh.crew).toBe(30);
    expect(fresh.submitMode).toBe('auto');
    expect(fresh.autopilot).toBe(true);
    expect(fresh.limits.costPerDay).toBe(50);
    expect(fresh.limits.openTabs).toBe(8);
  });
});

describe('issue 137: crew size in queue module', () => {
  it('does not export a hardcoded CREW_SIZE constant from queue.ts', () => {
    expect('CREW_SIZE' in queueModule).toBe(false);
  });
});
