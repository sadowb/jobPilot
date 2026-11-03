import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Grant, GrantKind, GrantScope } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { grant } from './grants.entity';

type Row = typeof grant.$inferSelect;
const toDto = (row: Row): Grant => ({
  id: row.id,
  kind: row.kind,
  provider: row.provider,
  scope: row.scope,
  executablePath: row.executablePath,
  grantedAt: row.grantedAt,
});

export class GrantsRepository {
  constructor(private readonly db: JobPilotDb) {}

  active(): Grant[] {
    return this.db.select().from(grant).where(isNull(grant.revokedAt)).orderBy(desc(grant.grantedAt)).all().map(toDto);
  }

  /** The active row including the stored hash, for the custom-agent check. */
  activeRow(kind: GrantKind, provider: string): Row | undefined {
    return this.db
      .select()
      .from(grant)
      .where(and(eq(grant.kind, kind), eq(grant.provider, provider), isNull(grant.revokedAt)))
      .get();
  }

  revoke(id: string, at: number): Grant | undefined {
    const row = this.db
      .update(grant)
      .set({ revokedAt: at })
      .where(and(eq(grant.id, id), isNull(grant.revokedAt)))
      .returning()
      .get();
    return row && toDto(row);
  }

  revokeActive(kind: GrantKind, provider: string, at: number): void {
    this.db
      .update(grant)
      .set({ revokedAt: at })
      .where(and(eq(grant.kind, kind), eq(grant.provider, provider), isNull(grant.revokedAt)))
      .run();
  }

  insert(input: {
    kind: GrantKind;
    provider: string;
    scope: GrantScope;
    executablePath: string | null;
    executableSha256: string | null;
  }): Grant {
    return toDto(this.db.insert(grant).values(input).returning().get());
  }
}
