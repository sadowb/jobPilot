import { index, integer, sqliteTable, sqliteView, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { EmailSignalKind, InboxThreadKind, InboxThreadStatus, MessageSender } from '../../../shared/dto';
import { createdAt, id, oneOf, timestamps } from '../../platform/db/columns';
import { application, applicationAnswer } from '../applications/applications.entity';

export const inboxThread = sqliteTable(
  'inbox_thread',
  {
    id: id(),
    /** Null for recruiter email that is not matched to an application yet. */
    applicationId: text('application_id').references(() => application.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: InboxThreadKind.values }).notNull(),
    status: text('status', { enum: InboxThreadStatus.values }).notNull().default('open'),
    subject: text('subject').notNull(),
    lastMessageAt: integer('last_message_at').notNull(),
    resolvedAt: integer('resolved_at'),
    ...timestamps(),
  },
  (t) => [
    index('inbox_thread_application_id_idx').on(t.applicationId),
    index('inbox_thread_status_last_message_idx').on(t.status, t.lastMessageAt),
    oneOf('inbox_thread_kind_ck', t.kind, InboxThreadKind.values),
    oneOf('inbox_thread_status_ck', t.status, InboxThreadStatus.values),
  ],
);

export const inboxMessage = sqliteTable(
  'inbox_message',
  {
    id: id(),
    threadId: text('thread_id')
      .notNull()
      .references(() => inboxThread.id, { onDelete: 'cascade' }),
    /** Set when this message asks for / carries the answer to an application question. */
    answerId: text('answer_id').references(() => applicationAnswer.id, { onDelete: 'set null' }),
    sender: text('sender', { enum: MessageSender.values }).notNull(),
    body: text('body').notNull(),
    /** Provider message id (Gmail); dedupes re-syncs. */
    externalId: text('external_id'),
    createdAt: createdAt(),
  },
  (t) => [
    index('inbox_message_thread_created_idx').on(t.threadId, t.createdAt),
    index('inbox_message_answer_id_idx').on(t.answerId),
    uniqueIndex('inbox_message_external_id_uq').on(t.externalId),
    oneOf('inbox_message_sender_ck', t.sender, MessageSender.values),
  ],
);

/** Machine-readable facts extracted from email (login codes, confirmations, rejections). */
export const emailSignal = sqliteTable(
  'email_signal',
  {
    id: id(),
    applicationId: text('application_id').references(() => application.id, { onDelete: 'set null' }),
    threadId: text('thread_id').references(() => inboxThread.id, { onDelete: 'set null' }),
    messageId: text('message_id').notNull(),
    kind: text('kind', { enum: EmailSignalKind.values }).notNull(),
    /** E.g. the verification code. */
    value: text('value'),
    receivedAt: integer('received_at').notNull(),
    consumedAt: integer('consumed_at'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('email_signal_message_id_uq').on(t.messageId),
    index('email_signal_application_id_idx').on(t.applicationId),
    index('email_signal_thread_id_idx').on(t.threadId),
    oneOf('email_signal_kind_ck', t.kind, EmailSignalKind.values),
  ],
);

/** Typed handle for `v_inbox` (see drizzle/). Keep in sync with the view SQL. */
export const vInbox = sqliteView('v_inbox', {
  threadId: text('thread_id').notNull(),
  kind: text('kind', { enum: InboxThreadKind.values }).notNull(),
  status: text('status', { enum: InboxThreadStatus.values }).notNull(),
  subject: text('subject').notNull(),
  lastMessageAt: integer('last_message_at').notNull(),
  messageCount: integer('message_count').notNull(),
  lastMessageBody: text('last_message_body'),
  applicationId: text('application_id'),
  title: text('title'),
  companyName: text('company_name'),
}).existing();
