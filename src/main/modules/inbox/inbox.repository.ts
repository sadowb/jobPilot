import { and, asc, desc, eq } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import { applicationAnswer } from '../applications/applications.entity';
import { inboxMessage, inboxThread } from './inbox.entity';

const SUBJECT = 'Chat with agent';

export interface ChatRow {
  id: string;
  sender: 'owner' | 'agent' | 'employer' | 'system';
  body: string;
  createdAt: number;
}

/** The per-job chat thread: one `system` thread per application, holding the owner's and the agent's messages. */
export class InboxRepository {
  constructor(private readonly db: JobPilotDb) {}

  /** Answers stored for one application (the owner's, the agent's, the library's). */
  savedAnswers(applicationId: string) {
    return this.db
      .select({
        fieldKey: applicationAnswer.fieldKey,
        questionText: applicationAnswer.questionText,
        answer: applicationAnswer.answer,
        source: applicationAnswer.source,
      })
      .from(applicationAnswer)
      .where(eq(applicationAnswer.applicationId, applicationId))
      .all();
  }

  private thread(applicationId: string) {
    return this.db
      .select()
      .from(inboxThread)
      .where(and(eq(inboxThread.applicationId, applicationId), eq(inboxThread.kind, 'system')))
      .get();
  }

  ensureThread(applicationId: string): string {
    const existing = this.thread(applicationId);
    if (existing) return existing.id;
    return this.db
      .insert(inboxThread)
      .values({ applicationId, kind: 'system', subject: SUBJECT, lastMessageAt: Date.now() })
      .returning({ id: inboxThread.id })
      .get().id;
  }

  add(applicationId: string, sender: 'owner' | 'agent', body: string): ChatRow {
    const threadId = this.ensureThread(applicationId);
    return this.db.transaction((tx) => {
      const row = tx.insert(inboxMessage).values({ threadId, sender, body }).returning().get();
      tx.update(inboxThread).set({ lastMessageAt: row.createdAt }).where(eq(inboxThread.id, threadId)).run();
      return row;
    });
  }

  messages(applicationId: string): ChatRow[] {
    const thread = this.thread(applicationId);
    if (!thread) return [];
    return this.db
      .select()
      .from(inboxMessage)
      .where(eq(inboxMessage.threadId, thread.id))
      .orderBy(asc(inboxMessage.createdAt), asc(inboxMessage.id))
      .all();
  }

  /** The owner's newest messages, oldest first. */
  ownerNotes(applicationId: string, limit: number): string[] {
    const thread = this.thread(applicationId);
    if (!thread) return [];
    return this.db
      .select({ body: inboxMessage.body })
      .from(inboxMessage)
      .where(and(eq(inboxMessage.threadId, thread.id), eq(inboxMessage.sender, 'owner')))
      .orderBy(desc(inboxMessage.createdAt), desc(inboxMessage.id))
      .limit(limit)
      .all()
      .map((row) => row.body)
      .reverse();
  }
}
