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
    expect(CREW_MAX).toBe(64);
    expect(clampCrew(4.4)).toBe(4);
    expect(clampCrew(Number.NaN)).toBe(CREW_MIN);
  });

  it('places the board values on the track (4 of 32 is 9.68%)', () => {
    expect(crewPercent(6).toFixed(2)).toBe('7.94');
    expect(crewPercent(1)).toBe(0);
    expect(crewPercent(64)).toBe(100);
    expect(CREW_TICKS.map((t) => crewPercent(t).toFixed(2))).toEqual(['0.00', '23.81', '49.21', '74.60', '100.00']);
  });

  it('anchors first and last tick labels inside the track', () => {
    expect(tickTransform(1)).toBe('translateX(0)');
    expect(tickTransform(32)).toBe('translateX(-50%)');
    expect(tickTransform(64)).toBe('translateX(-100%)');
  });
});

describe('limit parsing', () => {
  const tabs = LIMIT_SPECS.find((s) => s.key === 'openTabs')!;
  const run = LIMIT_SPECS.find((s) => s.key === 'runSeconds')!;

  const ok = (value: number) => ({ ok: true, value });
  const bad = { ok: false, error: expect.stringContaining('whole number') };

  it('accepts plain whole numbers inside the range', () => {
    expect(parseLimit('12', tabs)).toEqual(ok(12));
    expect(parseLimit(' 8 ', tabs)).toEqual(ok(8));
    expect(
      parseLimit(
        '1000',
        LIMIT_SPECS.find((l) => l.key === 'costPerDay')!,
      ),
    ).toEqual(ok(1000));
  });

  it('rejects instead of reinterpreting decimals, exponents, signs and symbols', () => {
    const cost = LIMIT_SPECS.find((l) => l.key === 'costPerDay')!;
    for (const raw of ['2.5', '1e3', '-5', '+5', '$12', '1,000', '0x10', 'abc', '', '  ', '٣']) {
      expect(parseLimit(raw, cost)).toMatchObject(bad);
    }
  });

  it('rejects out-of-range numbers instead of clamping', () => {
    expect(parseLimit('0', tabs)).toMatchObject(bad);
    expect(parseLimit('999', tabs)).toMatchObject(bad);
    expect(parseLimit('10', run)).toMatchObject(bad);
    expect(parseLimit('99999999', run)).toMatchObject(bad);
  });
});

describe('autopilot caption', () => {
  it('reflects the switch and the crew size', () => {
    expect(autopilotStatus(true, 4)).toContain('Crew 2 / 4 busy');
    expect(autopilotStatus(true, 99)).toContain('/ 64 busy');
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
    expect(() => UpdateSettingsSchema.parse({ crew: 65 })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ crew: -5 })).toThrow();
    expect(() => UpdateSettingsSchema.parse({ crew: 1.5 })).toThrow();
    expect(UpdateSettingsSchema.parse({ crew: 1 }).crew).toBe(1);
    expect(UpdateSettingsSchema.parse({ crew: 64 }).crew).toBe(64);

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

  it('defaults autopilot to off and crew to six (ADR 0016)', () => {
    expect(AppSettingsSchema.parse({}).autopilot).toBe(false);
    expect(AppSettingsSchema.parse({}).crew).toBe(6);
  });

  it('rejects autopilot: true until the feature ships', () => {
    expect(() => UpdateSettingsSchema.parse({ autopilot: true })).toThrow();
    expect(UpdateSettingsSchema.parse({ autopilot: false }).autopilot).toBe(false);
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

    const updated = updateSettings({ crew: 60 }, testDb);
    expect(updated.crew).toBe(60);

    expect(applyConcurrency(testDb)).toBe(60);

    const updatedLimits = updateSettings({ limits: { costPerDay: 50 } }, testDb);
    expect(updatedLimits.limits).toEqual({
      openTabs: 8,
      costPerDay: 50,
      runSeconds: 540,
      stuckSeconds: 120,
    });

    expect(() => updateSettings({ autopilot: true } as never, testDb)).toThrow();
    updateSettings({ submitMode: 'auto' }, testDb);

    const fresh = getSettings(testDb);
    expect(fresh.crew).toBe(60);
    expect(fresh.submitMode).toBe('auto');
    expect(fresh.autopilot).toBe(false);
    expect(fresh.limits.costPerDay).toBe(50);
    expect(fresh.limits.openTabs).toBe(8);
  });
});

describe('autopilot normalised on read', () => {
  it('reports off even when an older build stored true', () => {
    const sqlite = new Database(':memory:');
    sqlite.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);');
    sqlite.exec(`INSERT INTO settings VALUES ('runs.autopilot', 'true', 0)`);
    expect(getSettings(drizzle(sqlite, { schema }) as JobPilotDb).autopilot).toBe(false);
  });
});

describe('issue 137: crew size in queue module', () => {
  it('does not export a hardcoded CREW_SIZE constant from queue.ts', () => {
    expect('CREW_SIZE' in queueModule).toBe(false);
  });
});
