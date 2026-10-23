import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { id, timestamps } from '../../platform/db/columns';

/** Single-owner app: exactly one row, enforced by ProfileService (upsert), not by the schema. */
export const profile = sqliteTable('profile', {
  id: id(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  city: text('city'),
  country: text('country'),
  address: text('address'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  portfolioUrl: text('portfolio_url'),
  summary: text('summary'),
  workAuthorization: text('work_authorization'),
  requiresSponsorship: integer('requires_sponsorship', { mode: 'boolean' }),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency'),
  noticePeriodDays: integer('notice_period_days'),
  /** Job-search preferences (markets, roles, remote); shape owned by profile.dto.ts. */
  preferences: text('preferences', { mode: 'json' }),
  ...timestamps(),
});

export const experience = sqliteTable(
  'experience',
  {
    id: id(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    title: text('title').notNull(),
    location: text('location'),
    /** ISO year-month, `YYYY-MM`. */
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    description: text('description'),
    position: integer('position').notNull().default(0),
    ...timestamps(),
  },
  (t) => [index('experience_profile_id_idx').on(t.profileId)],
);

export const education = sqliteTable(
  'education',
  {
    id: id(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    institution: text('institution').notNull(),
    degree: text('degree'),
    field: text('field'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    grade: text('grade'),
    position: integer('position').notNull().default(0),
    ...timestamps(),
  },
  (t) => [index('education_profile_id_idx').on(t.profileId)],
);
