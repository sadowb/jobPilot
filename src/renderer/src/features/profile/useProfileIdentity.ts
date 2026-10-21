import { useEffect, useState } from 'react';
import { initials, PROFILE_KEY, readProfile } from './personal';

function identity() {
  try {
    const p = readProfile(localStorage.getItem(PROFILE_KEY));
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Your profile';
    return { name, initials: initials(name), headline: p.headline || 'Your next chapter, in one place.' };
  } catch {
    return { name: 'Your profile', initials: 'ME', headline: 'Your next chapter, in one place.' };
  }
}

export function useProfileIdentity() {
  const [value, setValue] = useState(identity);
  useEffect(() => {
    const update = () => setValue(identity());
    window.addEventListener('jobpilot:profile-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('jobpilot:profile-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return value;
}
