import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { ACTIVE_RUN_STATUSES, AgentId, ApprovalStatus, BrowserId, RunEventType, RunStatus } from '../../../shared/dto';
import { createdAt, id, inList, oneOf, timestamps } from '../../platform/db/columns';
import { application } from '../applications/applications.entity';
import { documentVersion } from '../documents/documents.entity';

export const run = sqliteTable(
  'run',
  {
    id: id(),
    applicationId: text('application_id')
      .notNull()
      .references(() => application.id, { onDelete: 'cascade' }),
    status: text('status', { enum: RunStatus.values }).notNull().default('queued'),
    agent: text('agent', { enum: AgentId.values }).notNull(),
    browser: text('browser', { enum: BrowserId.values }).notNull(),
    model: text('model'),
    /** Agent-side session id, used to resume. */
    sessionId: text('session_id'),
    /** Id of the browser tab owned by this run. */
    tabId: text('tab_id'),
    attempt: integer('attempt').notNull().default(1),
    /** Hash of the form the run last filled; the approval binds to it. */
    formHash: text('form_hash'),
    /** Validated RunResult (see platform/agents/types.ts). */
    result: text('result', { mode: 'json' }),
    error: text('error'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    /** Cost in millionths of a USD; integer to avoid float drift. */
    costMicros: integer('cost_micros'),
    /** Slot claims so far; a run interrupted three times is failed instead of resumed again. */
    attempts: integer('attempts').notNull().default(0),
    claimedAt: integer('claimed_at'),
    /** Last agent event; the stuck watchdog compares it to limits.stuckSeconds. */
    progressAt: integer('progress_at'),
    startedAt: integer('started_at'),
    finishedAt: integer('finished_at'),
    ...timestamps(),
  },
  (t) => [
    // At most one active run per application.
    uniqueIndex('run_one_active_per_application_uq').on(t.applicationId).where(inList(t.status, ACTIVE_RUN_STATUSES)),
    index('run_application_created_idx').on(t.applicationId, t.createdAt),
    index('run_status_idx').on(t.status),
    oneOf('run_status_ck', t.status, RunStatus.values),
    oneOf('run_agent_ck', t.agent, AgentId.values),
    oneOf('run_browser_ck', t.browser, BrowserId.values),
  ],
);

/** Every agent event of a run; mirrored to logs/runs/<run_id>.jsonl by RunTraceService. */
export const runEvent = sqliteTable(
  'run_event',
  {
    id: id(),
    runId: text('run_id')
      .notNull()
      .references(() => run.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    type: text('type', { enum: RunEventType.values }).notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('run_event_run_seq_uq').on(t.runId, t.seq),
    index('run_event_run_created_idx').on(t.runId, t.createdAt),
    oneOf('run_event_type_ck', t.type, RunEventType.values),
  ],
);

/** The owner's go-ahead to submit, bound to the exact form (form_hash) and CV they saw. */
export const approval = sqliteTable(
  'approval',
  {
    id: id(),
    runId: text('run_id')
      .notNull()
      .references(() => run.id, { onDelete: 'cascade' }),
    applicationId: text('application_id')
      .notNull()
      .references(() => application.id, { onDelete: 'cascade' }),
    cvVersionId: text('cv_version_id').references(() => documentVersion.id, { onDelete: 'restrict' }),
    formHash: text('form_hash').notNull(),
    status: text('status', { enum: ApprovalStatus.values }).notNull().default('pending'),
    decidedBy: text('decided_by', { enum: ['owner', 'auto'] }),
    /** Snapshot of what will be submitted, shown on the approval card. */
    summary: text('summary', { mode: 'json' }),
    decidedAt: integer('decided_at'),
    ...timestamps(),
  },
  (t) => [
    index('approval_run_id_idx').on(t.runId),
    index('approval_application_id_idx').on(t.applicationId),
    index('approval_cv_version_id_idx').on(t.cvVersionId),
    index('approval_status_idx').on(t.status),
    oneOf('approval_status_ck', t.status, ApprovalStatus.values),
    oneOf('approval_decided_by_ck', t.decidedBy, ['owner', 'auto']),
  ],
);
