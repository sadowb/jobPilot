import { useEffect, useState } from 'react';

/**
 * Read-only view of saved data owned by another component (e.g. the About me editors).
 * Re-reads when anything on this page saves, or another window changes storage.
 * `read` must be total: return a fallback instead of throwing.
 */
export function useLiveRead<T>(read: () => T): T {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const update = () => setValue(read());
    window.addEventListener('jobpilot:profile-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('jobpilot:profile-changed', update);
      window.removeEventListener('storage', update);
    };
    // `read` is a stable module-level function at every call site.
  }, [read]);
  return value;
}
