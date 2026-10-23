import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import { ProfileDataSchema, ProfileSaveSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import { getProfile, isProfileMigrated, migrateProfile, saveProfile } from './profile.service';

export const profileHandlers = [
  defineHandler(Channels.profileMigrationDone, z.void(), () => z.boolean().parse(isProfileMigrated())),
  defineHandler(Channels.getProfile, z.void(), () => ProfileDataSchema.parse(getProfile())),
  defineHandler(Channels.saveProfile, ProfileSaveSchema, (input) => ProfileDataSchema.parse(saveProfile(input))),
  defineHandler(Channels.migrateProfile, ProfileDataSchema, (input) => ProfileDataSchema.parse(migrateProfile(input))),
];
