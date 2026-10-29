import { and, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { FillPlanDto, PostingFormDto } from '../../../shared/dto';
import * as schema from '../../platform/db/schema';
import { salaryRange } from './ats/common';
import { canonicalKey } from './canonical';
import { answerLibrary, company, jobPosting, postingQuestion } from './postings.entity';
import { UserFacingError } from '../../platform/ipc/user-facing-error';

export type PostingsDb = BetterSQLite3Database<typeof schema>;

export class PostingsRepository {
  constructor(private readonly db: PostingsDb) {}

  get(postingId: string) {
    const posting = this.db.select().from(jobPosting).where(eq(jobPosting.id, postingId)).get();
    if (!posting || posting.deletedAt !== null) throw new UserFacingError('Posting is unavailable.');
    return posting;
  }

  /** Owner confirmation of an unverified page; idempotent. */
  confirm(postingId: string): void {
    const done = this.db
      .update(jobPosting)
      .set({ verified: true })
      .where(and(eq(jobPosting.id, postingId), isNull(jobPosting.deletedAt)))
      .returning({ id: jobPosting.id })
      .get();
    if (!done) throw new UserFacingError('Posting is unavailable.');
  }

  /** The stored result of an earlier agent read of this exact URL, so a re-paste never runs the agent again. */
  findAgentRead(canonicalUrl: string): PostingFormDto | null {
    const row = this.db
      .select({ posting: jobPosting, company: company.name })
      .from(jobPosting)
      .innerJoin(company, eq(company.id, jobPosting.companyId))
      .where(
        and(eq(jobPosting.canonicalUrl, canonicalUrl), eq(jobPosting.source, 'agent'), isNull(jobPosting.deletedAt)),
      )
      .get();
    if (!row) return null;
    const { posting: p } = row;
    const questions = this.db
      .select()
      .from(postingQuestion)
      .where(eq(postingQuestion.postingId, p.id))
      .orderBy(postingQuestion.position)
      .all();
    return {
      company: row.company,
      title: p.title,
      location: p.location,
      salary: salaryRange({ min: p.salaryMin, max: p.salaryMax, currency: p.salaryCurrency }).salary,
      salary_min: p.salaryMin,
      salary_max: p.salaryMax,
      salary_currency: p.salaryCurrency,
      description: p.description,
      canonical_url: p.canonicalUrl,
      ats: p.ats,
      ats_tenant: null,
      ats_job_id: p.atsJobId,
      questions: questions.map((q) => ({
        external_id: q.fieldKey,
        label: q.label,
        type: q.type,
        required: q.required,
        options: q.options ?? [],
        position: q.position,
        canonical_key: q.canonicalKey,
      })),
      verified: p.verified,
      source: 'agent',
    };
  }

  ingest(form: PostingFormDto): string {
    return this.db.transaction((tx) => {
      const normalizedName = form.company.normalize('NFKC').toLocaleLowerCase();
      const nameKey = normalizedName.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() || normalizedName;
      const companyRow = tx
        .insert(company)
        .values({ name: form.company, nameKey })
        .onConflictDoUpdate({ target: company.nameKey, set: { name: form.company } })
        .returning({ id: company.id })
        .get();
      const existing = tx
        .select({ canonicalUrl: jobPosting.canonicalUrl })
        .from(jobPosting)
        .where(
          or(
            eq(jobPosting.canonicalUrl, form.canonical_url),
            form.ats_job_id === null
              ? undefined
              : and(eq(jobPosting.ats, form.ats), eq(jobPosting.atsJobId, form.ats_job_id)),
          ),
        )
        .get();
      const posted = tx
        .insert(jobPosting)
        .values({
          companyId: companyRow.id,
          url: form.canonical_url,
          // A re-paste (tracking params, trailing slash) must not rewrite the stored url or canonical url.
          canonicalUrl: existing?.canonicalUrl ?? form.canonical_url,
          ats: form.ats,
          atsJobId: form.ats_job_id,
          title: form.title,
          location: form.location,
          description: form.description,
          salaryMin: form.salary_min,
          salaryMax: form.salary_max,
          salaryCurrency: form.salary_currency,
          fetchedAt: Date.now(),
          verified: form.verified,
          source: form.source,
          deletedAt: null,
        })
        .onConflictDoUpdate({
          target: jobPosting.canonicalUrl,
          set: {
            companyId: companyRow.id,
            ats: form.ats,
            atsJobId: form.ats_job_id,
            title: form.title,
            location: form.location,
            description: form.description,
            salaryMin: form.salary_min,
            salaryMax: form.salary_max,
            salaryCurrency: form.salary_currency,
            fetchedAt: Date.now(),
            // A re-read can raise verification (JSON-LD appeared) but never revoke the owner's confirmation.
            verified: sql`${jobPosting.verified} OR ${form.verified ? 1 : 0}`,
            source: form.source,
            deletedAt: null,
          },
        })
        .returning({ id: jobPosting.id })
        .get();

      const keys = [
        ...new Set(form.questions.map((q) => q.canonical_key).filter((key): key is string => key !== null)),
      ];
      const known = keys.length
        ? new Set(
            tx
              .select({ key: answerLibrary.canonicalKey })
              .from(answerLibrary)
              .where(inArray(answerLibrary.canonicalKey, keys))
              .all()
              .map((row) => row.key),
          )
        : new Set<string>();
      const fields = form.questions.map((q) => q.external_id);
      if (fields.length) {
        tx.delete(postingQuestion)
          .where(and(eq(postingQuestion.postingId, posted.id), notInArray(postingQuestion.fieldKey, fields)))
          .run();
      } else {
        tx.delete(postingQuestion).where(eq(postingQuestion.postingId, posted.id)).run();
      }
      for (const q of form.questions) {
        tx.insert(postingQuestion)
          .values({
            postingId: posted.id,
            fieldKey: q.external_id,
            position: q.position,
            label: q.label,
            type: q.type,
            required: q.required,
            options: q.options,
            canonicalKey: q.canonical_key && known.has(q.canonical_key) ? q.canonical_key : null,
          })
          .onConflictDoUpdate({
            target: [postingQuestion.postingId, postingQuestion.fieldKey],
            set: {
              position: q.position,
              label: q.label,
              type: q.type,
              required: q.required,
              options: q.options,
              canonicalKey: q.canonical_key && known.has(q.canonical_key) ? q.canonical_key : null,
            },
          })
          .run();
      }
      return posted.id;
    });
  }

  resolveFillPlan(applicationId: string): FillPlanDto {
    const app = this.db
      .select({ postingId: schema.application.postingId })
      .from(schema.application)
      .where(eq(schema.application.id, applicationId))
      .get();
    if (!app) throw new Error(`Application ${applicationId} was not found`);
    const profileRow = this.db.select().from(schema.profile).get();
    const questions = this.db
      .select({
        fieldKey: postingQuestion.fieldKey,
        label: postingQuestion.label,
        required: postingQuestion.required,
        canonicalKey: postingQuestion.canonicalKey,
        answer: answerLibrary.answer,
      })
      .from(postingQuestion)
      .leftJoin(answerLibrary, eq(postingQuestion.canonicalKey, answerLibrary.canonicalKey))
      .where(eq(postingQuestion.postingId, app.postingId))
      .orderBy(postingQuestion.position)
      .all();
    const answerMap = new Map(
      this.db
        .select({ key: answerLibrary.canonicalKey, answer: answerLibrary.answer })
        .from(answerLibrary)
        .all()
        .map((row) => [row.key, row.answer]),
    );

    const profileAnswers: Record<string, string | null> = {
      work_authorization: profileRow?.workAuthorization ?? null,
      requires_sponsorship:
        profileRow?.requiresSponsorship == null ? null : profileRow.requiresSponsorship ? 'Yes' : 'No',
      salary_expectation:
        profileRow?.salaryMin == null && profileRow?.salaryMax == null
          ? null
          : `${profileRow.salaryCurrency ?? ''} ${profileRow.salaryMin ?? ''}${profileRow.salaryMin != null && profileRow.salaryMax != null ? '–' : ''}${profileRow.salaryMax ?? ''}`.trim(),
      notice_period: profileRow?.noticePeriodDays == null ? null : `${profileRow.noticePeriodDays} days`,
      linkedin_url: profileRow?.linkedinUrl ?? null,
      website_url: profileRow?.portfolioUrl ?? null,
    };
    const entries = questions.map((q) => {
      const key = q.canonicalKey ?? canonicalKey(q.label);
      const libraryValue = q.answer ?? (key ? (answerMap.get(key) ?? null) : null);
      const profileValue = key ? (profileAnswers[key] ?? null) : null;
      const value = libraryValue ?? profileValue;
      return {
        field_key: q.fieldKey,
        label: q.label,
        value,
        source: libraryValue ? ('library' as const) : profileValue ? ('profile' as const) : null,
        required: q.required,
      };
    });
    return {
      application_id: applicationId,
      entries,
      unresolved_required: entries
        .filter((entry) => entry.required && entry.value === null)
        .map(({ field_key, label }) => ({ field_key, label })),
    };
  }
}
