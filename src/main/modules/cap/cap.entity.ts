import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AgentId, CapRole } from '../../../shared/dto';
import { createdAt, deletedAt, id, oneOf, timestamps } from '../../platform/db/columns';

export const capConversation = sqliteTable(
  'cap_conversation',
  {
    id: id(),
    title: text('title'),
    agent: text('agent', { enum: AgentId.values }).notNull(),
    /** Agent-side session id, used to resume. */
    sessionId: text('session_id'),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [oneOf('cap_conversation_agent_ck', t.agent, AgentId.values)],
);

export const capMessage = sqliteTable(
  'cap_message',
  {
    id: id(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => capConversation.id, { onDelete: 'cascade' }),
    role: text('role', { enum: CapRole.values }).notNull(),
    content: text('content').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('cap_message_conversation_created_idx').on(t.conversationId, t.createdAt),
    oneOf('cap_message_role_ck', t.role, CapRole.values),
  ],
);
