import { describe, expect, it } from 'vitest';
import {
  backupUnreadable,
  commitSaved,
  loadSaved,
  UNREADABLE_MESSAGE,
} from '../src/renderer/src/features/profile/savedStorage';
import { readMarkets } from '../src/renderer/src/features/profile/markets';

function fakeStore(initial: Record<string, string> = {}, failOn?: (key: string) => boolean) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failOn?.(k)) throw new Error('quota');
      data.set(k, v);
    },
  };
}

describe('unreadable saved data', () => {
  it('reports an unreadable value, returns the default and keeps the raw text', () => {
    const store = fakeStore({ k: '{' });
    const loaded = loadSaved(store, 'k', readMarkets);
    expect(loaded.value).toEqual([]);
    expect(loaded.error).toBe(UNREADABLE_MESSAGE);
    expect(loaded.unreadableRaw).toBe('{');
    expect(store.data.get('k')).toBe('{');
  });

  it('loads a good or missing value without error', () => {
    expect(loadSaved(fakeStore(), 'k', readMarkets)).toEqual({ value: [], error: '', unreadableRaw: null });
    const good = JSON.stringify([{ code: 'US', workAuth: 'authorized' }]);
    expect(loadSaved(fakeStore({ k: good }), 'k', readMarkets).value).toHaveLength(1);
  });

  it('backs the unreadable value up under a timestamped key before overwriting', () => {
    const store = fakeStore({ k: '{' });
    const { unreadableRaw } = loadSaved(store, 'k', readMarkets);
    commitSaved(store, 'k', [{ code: 'US', workAuth: 'authorized' }], unreadableRaw);
    const backups = [...store.data.keys()].filter((key) => key.startsWith('k.corrupt-'));
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatch(/^k\.corrupt-\d{4}-\d{2}-\d{2}T/);
    expect(store.data.get(backups[0]!)).toBe('{');
    expect(readMarkets(store.data.get('k') ?? null)).toEqual([{ code: 'US', workAuth: 'authorized' }]);
  });

  it('does not create a backup when the previous value was readable', () => {
    const store = fakeStore();
    commitSaved(store, 'k', [], null);
    expect([...store.data.keys()]).toEqual(['k']);
  });

  it('refuses to overwrite when the backup cannot be written', () => {
    const store = fakeStore({ k: '{' }, (key) => key.includes('.corrupt-'));
    expect(() => commitSaved(store, 'k', [], '{')).toThrow();
    expect(store.data.get('k')).toBe('{');
  });

  it('names the backup after the given time', () => {
    const store = fakeStore();
    const key = backupUnreadable(store, 'k', 'bad', new Date('2026-10-22T10:00:00.000Z'));
    expect(key).toBe('k.corrupt-2026-10-22T10:00:00.000Z');
  });
});
