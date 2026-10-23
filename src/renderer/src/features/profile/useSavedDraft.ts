import { useEffect, useRef, useState } from 'react';
import { readProfileData, saveProfileData } from './profileStorage';

export function useSavedDraft<T>(key: string, read: (raw: string | null) => T) {
  const [saved, setSaved] = useState(() => read(readProfileData(key)));
  const [draft, setDraft] = useState(saved);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const save = async (next = draft) => {
    if (saving.current) return false;
    saving.current = true;
    try {
      await saveProfileData(key, next);
      setSaved(next);
      setDraft(next);
      setError('');
      setMessage('Saved on this device');
      return true;
    } catch {
      setError('Could not save on this device. Your edits are still here. Please try again.');
      return false;
    } finally {
      saving.current = false;
    }
  };
  const cancel = () => {
    setDraft(saved);
    setMessage('');
  };
  return { draft, setDraft, dirty, save, cancel, message, error };
}
