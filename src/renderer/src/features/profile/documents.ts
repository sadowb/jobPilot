export interface ProfileDocument {
  id: string;
  name: string;
  file: Blob;
  uploaded: string;
  /** Optional, shown in the CV list when present: "AI and machine-learning" → "For AI and machine-learning jobs". */
  forJobs?: string;
  language?: string;
}

function openDocuments(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('jobpilot-profile', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents', { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Document storage is busy. Close other JobPilot windows and try again.'));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function documentStore(action: 'list'): Promise<ProfileDocument[]>;
export async function documentStore(action: 'put', doc: ProfileDocument): Promise<void>;
export async function documentStore(action: 'delete', id: string): Promise<void>;
export async function documentStore(
  action: 'list' | 'put' | 'delete',
  value?: ProfileDocument | string,
): Promise<ProfileDocument[] | void> {
  const db = await openDocuments();
  try {
    return await new Promise<ProfileDocument[] | void>((resolve, reject) => {
      const tx = db.transaction('documents', action === 'list' ? 'readonly' : 'readwrite');
      const store = tx.objectStore('documents');
      const request =
        action === 'list' ? store.getAll() : action === 'put' ? store.put(value) : store.delete(value as string);
      tx.oncomplete = () => resolve(action === 'list' ? (request.result as ProfileDocument[]) : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Document change was cancelled.'));
    });
  } finally {
    db.close();
  }
}
