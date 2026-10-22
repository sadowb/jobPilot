import { useEffect, useState } from 'react';
import { ANSWERS_V2_KEY, answerMarkets, answerSummary, readAnswersV2 } from './answers';
import { MARKETS_KEY, countryName, readMarkets } from './markets';
import { ANSWERS_KEY, EMPTY_PROFILE, cvFileName, fullName, initials, PROFILE_KEY, readProfile } from './personal';

export interface ProfileIdentity {
  /** Empty when the user has not entered a name. Never a placeholder. */
  name: string;
  initials: string;
  headline: string;
  /** "Ifrane, Morocco" or empty. */
  location: string;
  /** What employers receive, e.g. "Ada Lovelace.pdf". */
  fileName: string;
  /** Answers the user has written (blank questions are not counted), for the tab count. */
  answersCount: number;
}

const EMPTY: ProfileIdentity = {
  name: '',
  initials: 'ME',
  headline: '',
  location: '',
  fileName: cvFileName({ firstName: '', lastName: '' }),
  answersCount: 0,
};

function identity(): ProfileIdentity {
  let value = EMPTY;
  let profile: ReturnType<typeof readProfile> | undefined;
  try {
    const p = readProfile(localStorage.getItem(PROFILE_KEY));
    profile = p;
    const name = fullName(p);
    value = {
      ...value,
      name,
      initials: initials(name),
      headline: p.headline.trim(),
      location: [p.city, (p.countryCode && countryName(p.countryCode)) || p.country]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(', '),
      fileName: cvFileName(p),
    };
  } catch {
    /* unreadable profile: show the empty identity, the About me tab explains why */
  }
  try {
    const answers = readAnswersV2(localStorage.getItem(ANSWERS_V2_KEY), localStorage.getItem(ANSWERS_KEY));
    let stored: ReturnType<typeof readMarkets> = [];
    try {
      stored = readMarkets(localStorage.getItem(MARKETS_KEY));
    } catch {
      /* unreadable markets: counted as none */
    }
    // Same function as the Common answers footer, so the tab badge and the footer always agree.
    const source = profile ?? EMPTY_PROFILE;
    const counts = answerSummary(answers, answerMarkets(source, stored), source);
    value = { ...value, answersCount: counts.answered };
  } catch {
    /* unreadable answers: count stays 0 */
  }
  return value;
}

export function useProfileIdentity(): ProfileIdentity {
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
