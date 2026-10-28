import { index, integer, sqliteTable, sqliteView, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { Actor, AgentId, AnswerSource, ApplicationStatus, RunStatus } from '../../../shared/dto';
import { createdAt, deletedAt, id, oneOf, timestamps } from '../../platform/db/columns';
import { documentVersion } from '../documents/documents.entity';
import { answerLibrary, jobPosting, postingQuestion } from '../postings/postings.entity';
// Import cycle with runs.entity (application_event.run_id <-> run.application_id) is safe: every cross-table reference is a lazy arrow.
import { run } from '../runs/runs.entity';

export const application = sqliteTable(
  'application',
  {
    id: id(),
    postingId: text('posting_id')
      .notNull()
      .references(() => jobPosting.id, { onDelete: 'restrict' }),
    /** The exact CV version this application uses (pinned at approval). */
    cvVersionId: text('cv_version_id').references(() => documentVersion.id, { onDelete: 'restrict' }),
    status: text('status', { enum: ApplicationStatus.values }).notNull().default('queued'),
    /** Order inside the queue; lower runs first. */
    queueRank: integer('queue_rank').notNull(),
    appliedAt: integer('applied_at'),
    lastActivityAt: integer('last_activity_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    notes: text('notes'),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex('application_posting_id_uq').on(t.postingId),
    index('application_status_queue_rank_idx').on(t.status, t.queueRank),
    index('application_cv_version_id_idx').on(t.cvVersionId),
    oneOf('application_status_ck', t.status, ApplicationStatus.values),
  ],
);

export const applicationAnswer = sqliteTable(
  'application_answer',
  {
    id: id(),
    applicationId: text('application_id')
      .notNull()
      .references(() => application.id, { onDelete: 'cascade' }),
    /** Null for fields the agent discovered on a custom site. */
    questionId: text('question_id').references(() => postingQuestion.id, { onDelete: 'set null' }),
    libraryId: text('library_id').references(() => answerLibrary.id, { onDelete: 'set null' }),
    fieldKey: text('field_key').notNull(),
    questionText: text('question_text').notNull(),
    /** Null while the question still needs an answer from the owner. */
    answer: text('answer'),
    source: text('source', { enum: AnswerSource.values }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('application_answer_field_uq').on(t.applicationId, t.fieldKey),
    index('application_answer_question_id_idx').on(t.questionId),
    index('application_answer_library_id_idx').on(t.libraryId),
    oneOf('application_answer_source_ck', t.source, AnswerSource.values),
  ],
);

/** Append-only audit trail; written by AuditService. */
export const applicationEvent = sqliteTable(
  'application_event',
  {
    id: id(),
    applicationId: text('application_id')
      .notNull()
      .references(() => application.id, { onDelete: 'cascade' }),
    runId: text('run_id').references(() => run.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    actor: text('actor', { enum: Actor.values }).notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    data: text('data', { mode: 'json' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('application_event_app_created_idx').on(t.applicationId, t.createdAt),
    index('application_event_run_id_idx').on(t.runId),
    oneOf('application_event_actor_ck', t.actor, Actor.values),
  ],
);

/** Typed handles for the SQL views created in drizzle/ (`.existing()`: drizzle-kit does not manage them). Keep in sync with the view SQL. */
const applicationListColumns = {
  id: text('id').notNull(),
  status: text('status', { enum: ApplicationStatus.values }).notNull(),
  queueRank: integer('queue_rank').notNull(),
  appliedAt: integer('applied_at'),
  lastActivityAt: integer('last_activity_at').notNull(),
  createdAt: integer('created_at').notNull(),
  cvVersionId: text('cv_version_id'),
  postingId: text('posting_id').notNull(),
  title: text('title').notNull(),
  location: text('location'),
  url: text('url').notNull(),
  verified: integer('verified', { mode: 'boolean' }).notNull(),
  companyId: text('company_id').notNull(),
  companyName: text('company_name').notNull(),
  latestRunId: text('latest_run_id'),
  latestRunStatus: text('latest_run_status', { enum: RunStatus.values }),
  latestRunAgent: text('latest_run_agent', { enum: AgentId.values }),
};
export const vApplicationList = sqliteView('v_application_list', applicationListColumns).existing();
export const vUpNext = sqliteView('v_up_next', applicationListColumns).existing();
