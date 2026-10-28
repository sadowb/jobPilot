import { eq } from 'drizzle-orm';
import { ProfileDataSchema, type ProfileData } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { profile } from './profile.entity';

export class ProfileRepository {
  constructor(private readonly db: JobPilotDb) {}

  read(): ProfileData {
    const row = this.db.select().from(profile).get();
    if (!row) return { personal: null, markets: [], answers: null, onboardingCompletedAt: null };
    const data = ProfileDataSchema.parse(row.preferences);
    if (data.onboardingCompletedAt === null && data.personal !== null) {
      return { ...data, onboardingCompletedAt: row.updatedAt ?? row.createdAt ?? Date.now() };
    }
    return data;
  }

  write(data: ProfileData): void {
    const current = this.db.select({ id: profile.id }).from(profile).get();
    const p = data.personal;
    const values = {
      firstName: p?.firstName ?? '',
      lastName: p?.lastName ?? '',
      email: p?.email ?? '',
      phone: p?.phone || null,
      city: p?.city || null,
      country: p?.countryCode || p?.country || null,
      address: p?.address || null,
      linkedinUrl: p?.linkedin || null,
      githubUrl: p?.github || null,
      portfolioUrl: p?.website || null,
      summary: p?.bio || null,
      salaryMin: p?.salaryAmount == null ? null : p.salaryAmount * (p.salaryPeriod === 'month' ? 12 : 1),
      salaryCurrency: p?.salaryCurrency || null,
      noticePeriodDays: p?.notice?.kind === 'period' ? p.notice.days : null,
      preferences: data,
    };
    if (current) this.db.update(profile).set(values).where(eq(profile.id, current.id)).run();
    else this.db.insert(profile).values(values).run();
  }
}
