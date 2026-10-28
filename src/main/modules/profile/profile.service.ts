import type { ProfileData, ProfileSave } from '../../../shared/dto';
import { db, type JobPilotDb } from '../../platform/db/database';
import { markProfileMigrated, profileMigrationDone } from '../settings/settings.service';
import { hasOnboardingData, ProfileRepository } from './profile.repository';

export function isProfileMigrated(): boolean {
  return profileMigrationDone(db);
}

export function getProfile(database: JobPilotDb = db): ProfileData {
  return new ProfileRepository(database).read();
}

export function saveProfile(input: ProfileSave): ProfileData {
  return db.transaction((tx) => {
    const repository = new ProfileRepository(tx);
    const data = { ...repository.read(), [input.section]: input.value };
    repository.write(data);
    return repository.read();
  });
}

export function migrateProfile(input: ProfileData): ProfileData {
  return db.transaction((tx) => {
    const repository = new ProfileRepository(tx);
    if (!profileMigrationDone(tx)) {
      const current = repository.read();
      const personal = current.personal ?? input.personal;
      const markets = current.markets.length ? current.markets : input.markets;
      const answers = current.answers ?? input.answers;
      // Legacy renderer data is imported once here: if it holds onboarding answers, onboarding was finished.
      const onboardingCompletedAt =
        current.onboardingCompletedAt ??
        input.onboardingCompletedAt ??
        (hasOnboardingData({ personal, markets, answers }) ? Date.now() : null);
      repository.write({
        personal,
        markets,
        answers,
        onboardingCompletedAt,
      });
      markProfileMigrated(tx);
    }
    return repository.read();
  });
}
