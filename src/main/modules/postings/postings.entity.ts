import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { AtsKind, PostingSource, QuestionType } from '../../../shared/dto';
import { deletedAt, id, oneOf, timestamps } from '../../platform/db/columns';

export const company = sqliteTable(
  'company',
  {
    id: id(),
    name: text('name').notNull(),
    /** Lower-cased, punctuation-stripped name used for de-duplication. */
    nameKey: text('name_key').notNull(),
    domain: text('domain'),
    website: text('website'),
    ...timestamps(),
  },
  (t) => [uniqueIndex('company_domain_uq').on(t.domain), uniqueIndex('company_name_key_uq').on(t.nameKey)],
);

export const jobPosting = sqliteTable(
  'job_posting',
  {
    id: id(),
    companyId: text('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'restrict' }),
    url: text('url').notNull(),
    /** Normalised URL (no tracking params); the de-duplication key. */
    canonicalUrl: text('canonical_url').notNull(),
    ats: text('ats', { enum: AtsKind.values }).notNull(),
    /** The ATS's own job id, when a public API exists. */
    atsJobId: text('ats_job_id'),
    title: text('title').notNull(),
    location: text('location'),
    remote: integer('remote', { mode: 'boolean' }),
    description: text('description'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: text('salary_currency'),
    postedAt: integer('posted_at'),
    fetchedAt: integer('fetched_at'),
    /** Hash of the form structure last seen; an approval is bound to it. */
    formHash: text('form_hash'),
    closedAt: integer('closed_at'),
    /** false = a custom page accepted on apply-form evidence only; runs are refused until the owner confirms it. */
    verified: integer('verified', { mode: 'boolean' }).notNull().default(true),
    /** `agent` = read by the posting reader; such rows are the cache that stops a re-paste from re-running the agent. */
    source: text('source', { enum: PostingSource.values }).notNull().default('fetch'),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex('job_posting_canonical_url_uq').on(t.canonicalUrl),
    uniqueIndex('job_posting_ats_job_id_uq').on(t.ats, t.atsJobId),
    index('job_posting_company_id_idx').on(t.companyId),
    oneOf('job_posting_ats_ck', t.ats, AtsKind.values),
    oneOf('job_posting_source_ck', t.source, PostingSource.values),
  ],
);

/** Reusable answers keyed by a canonical question key; drives deterministic pre-fill. */
export const answerLibrary = sqliteTable(
  'answer_library',
  {
    id: id(),
    canonicalKey: text('canonical_key').notNull(),
    questionText: text('question_text').notNull(),
    answer: text('answer').notNull(),
    source: text('source', { enum: ['profile', 'agent', 'owner'] }).notNull(),
    timesUsed: integer('times_used').notNull().default(0),
    lastUsedAt: integer('last_used_at'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('answer_library_canonical_key_uq').on(t.canonicalKey),
    oneOf('answer_library_source_ck', t.source, ['profile', 'agent', 'owner']),
  ],
);

export const postingQuestion = sqliteTable(
  'posting_question',
  {
    id: id(),
    postingId: text('posting_id')
      .notNull()
      .references(() => jobPosting.id, { onDelete: 'cascade' }),
    /** The form field's own key/name on the ATS or career site. */
    fieldKey: text('field_key').notNull(),
    position: integer('position').notNull(),
    label: text('label').notNull(),
    type: text('type', { enum: QuestionType.values }).notNull(),
    required: integer('required', { mode: 'boolean' }).notNull().default(false),
    options: text('options', { mode: 'json' }).$type<string[]>(),
    canonicalKey: text('canonical_key').references(() => answerLibrary.canonicalKey, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('posting_question_field_uq').on(t.postingId, t.fieldKey),
    index('posting_question_canonical_key_idx').on(t.canonicalKey),
    oneOf('posting_question_type_ck', t.type, QuestionType.values),
  ],
);
