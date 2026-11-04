import { asc, eq, isNull } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import { capConversation, capMessage } from './cap.entity';

/** Cap's pilot chat: one conversation, created on first use. */
export class CapRepository {
  constructor(private readonly db: JobPilotDb) {}

  private conversationId(create: boolean): string | undefined {
    const existing = this.db.select().from(capConversation).where(isNull(capConversation.deletedAt)).get();
    if (existing || !create) return existing?.id;
    return this.db
      .insert(capConversation)
      .values({ title: 'Pilot chat', agent: 'claude' })
      .returning({ id: capConversation.id })
      .get().id;
  }

  add(role: 'user' | 'assistant', content: string) {
    const conversationId = this.conversationId(true)!;
    return this.db.insert(capMessage).values({ conversationId, role, content }).returning().get();
  }

  messages() {
    const conversationId = this.conversationId(false);
    if (!conversationId) return [];
    return this.db
      .select()
      .from(capMessage)
      .where(eq(capMessage.conversationId, conversationId))
      .orderBy(asc(capMessage.createdAt), asc(capMessage.id))
      .all();
  }
}
