import { useEffect, useState } from 'react';
import { documentStore } from './documents';

export const DOCUMENTS_CHANGED = 'jobpilot:documents-changed';

/** Number of stored documents; null while loading or when storage is unavailable. Refreshes on uploads/removals. */
export function useDocumentCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => {
      documentStore('list')
        .then((items) => live && setCount(items.length))
        .catch(() => live && setCount(null));
    };
    load();
    window.addEventListener(DOCUMENTS_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(DOCUMENTS_CHANGED, load);
    };
  }, []);
  return count;
}
