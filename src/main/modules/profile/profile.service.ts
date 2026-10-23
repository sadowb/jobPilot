import type { ProfileData, ProfileSave } from '../../../shared/dto';
import { db } from '../../platform/db/database';
import { markProfileMigrated, profileMigrationDone } from '../settings/settings.service';
import { ProfileRepository } from './profile.repository';

export function isProfileMigrated(): boolean {
  return profileMigrationDone(db);
}

export function getProfile(): ProfileData {
  return new ProfileRepository(db).read();
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
      repository.write({
        personal: current.personal ?? input.personal,
        markets: current.markets.length ? current.markets : input.markets,
        answers: current.answers ?? input.answers,
      });
      markProfileMigrated(tx);
    }
    return repository.read();
  });
}
