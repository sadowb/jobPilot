/** Minimal slice of `Storage`, so the helpers can be tested without a DOM. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface LoadedValue<T> {
  value: T;
  /** Non-empty when the stored value could not be read and `value` is the empty default. */
  error: string;
  /** The raw string that failed to parse. It must be backed up before anything overwrites it. */
  unreadableRaw: string | null;
}

export const UNREADABLE_MESSAGE =
  'Your saved information could not be read, so this page shows empty fields. When you save, the unreadable data is first copied to a backup on this device and then replaced.';

export function loadSaved<T>(store: KeyValueStore, key: string, read: (raw: string | null) => T): LoadedValue<T> {
  let raw: string | null = null;
  try {
    raw = store.getItem(key);
    return { value: read(raw), error: '', unreadableRaw: null };
  } catch {
    return { value: read(null), error: UNREADABLE_MESSAGE, unreadableRaw: raw };
  }
}

/**
 * Copies unreadable data to `<key>.corrupt-<ISO timestamp>` and returns that key.
 * Throws if the copy cannot be written, so the caller aborts instead of destroying the only copy.
 */
export function backupUnreadable(store: KeyValueStore, key: string, raw: string, now: Date = new Date()): string {
  const backupKey = `${key}.corrupt-${now.toISOString()}`;
  store.setItem(backupKey, raw);
  if (store.getItem(backupKey) !== raw) throw new Error('Backup could not be verified');
  return backupKey;
}

/** Writes `next`; if the previous value was unreadable it is backed up first. Throws before overwriting on failure. */
export function commitSaved<T>(store: KeyValueStore, key: string, next: T, unreadableRaw: string | null): void {
  if (unreadableRaw !== null) backupUnreadable(store, key, unreadableRaw);
  store.setItem(key, JSON.stringify(next));
}
