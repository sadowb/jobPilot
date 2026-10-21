import { useState } from 'react';

export function useSavedDraft<T>(key: string, read: (raw: string | null) => T) {
  const [initial] = useState(() => {
    try {
      return { value: read(localStorage.getItem(key)), error: '' };
    } catch {
      return {
        value: read(null),
        error: 'Your saved information could not be loaded. Your original data has not been changed.',
      };
    }
  });
  const [saved, setSaved] = useState(initial.value);
  const [draft, setDraft] = useState(initial.value);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(initial.error);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const save = (next = draft) => {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSaved(next);
      setDraft(next);
      setError('');
      setMessage('Saved on this device');
      window.dispatchEvent(new Event('jobpilot:profile-changed'));
      return true;
    } catch {
      setError('Could not save on this device. Your edits are still here. Please try again.');
      return false;
    }
  };
  const cancel = () => {
    setDraft(saved);
    setMessage('');
  };
  return { draft, setDraft, dirty, save, cancel, message, error };
}
