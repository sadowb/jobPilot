import { ProfileSaveSchema, type ProfileData } from '../../../../shared/dto';
import { saveProfile } from '../../lib/api';
import { ANSWERS_V2_KEY } from './answers';
import { MARKETS_KEY } from './markets';
import { PROFILE_KEY } from './personal';

let data: ProfileData = { personal: null, markets: [], answers: null, onboardingCompletedAt: null };

export function setProfileData(next: ProfileData): void {
  data = next;
  window.dispatchEvent(new Event('jobpilot:profile-changed'));
}

export function readProfileData(key: string): string | null {
  const value = key === PROFILE_KEY ? data.personal : key === MARKETS_KEY ? data.markets : data.answers;
  return value === null ? null : JSON.stringify(value);
}

export async function saveProfileData(key: string, value: unknown): Promise<void> {
  const section =
    key === PROFILE_KEY
      ? 'personal'
      : key === MARKETS_KEY
        ? 'markets'
        : key === ANSWERS_V2_KEY
          ? 'answers'
          : key === 'onboardingCompletedAt'
            ? 'onboardingCompletedAt'
            : null;
  if (!section) throw new Error('Unknown profile section');
  setProfileData(await saveProfile(ProfileSaveSchema.parse({ section, value })));
}

/** True while the loaded profile has not finished (or skipped) onboarding; false when no profile is loaded (web preview). */
export const onboardingPending = (): boolean => !!window.jobpilot && data.onboardingCompletedAt === null;
