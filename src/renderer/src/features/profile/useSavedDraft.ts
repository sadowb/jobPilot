import { useEffect, useRef, useState } from 'react';
import { commitSaved, loadSaved } from './savedStorage';

export function useSavedDraft<T>(key: string, read: (raw: string | null) => T) {
  const [initial] = useState(() => loadSaved(localStorage, key, read));
  // Raw value that failed to parse; kept until a save has backed it up and replaced it.
  const unreadable = useRef(initial.unreadableRaw);
  const [saved, setSaved] = useState(initial.value);
  const [draft, setDraft] = useState(initial.value);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(initial.error);
  // Success messages fade after a while; errors stay until resolved.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const save = (next = draft) => {
    try {
      commitSaved(localStorage, key, next, unreadable.current);
      const hadBackup = unreadable.current !== null;
      unreadable.current = null;
      setSaved(next);
      setDraft(next);
      setError('');
      setMessage(
        hadBackup ? 'Saved. The unreadable data was kept as a backup on this device.' : 'Saved on this device',
      );
      window.dispatchEvent(new Event('jobpilot:profile-changed'));
      return true;
    } catch {
      setError(
        'Could not save on this device. Your edits are still here and nothing was overwritten. Please try again.',
      );
      return false;
    }
  };
  const cancel = () => {
    setDraft(saved);
    setMessage('');
  };
  return { draft, setDraft, dirty, save, cancel, message, error };
}
