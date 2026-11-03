import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { GrantKind, GrantScope } from '../../../shared/dto';
import { createdAt, id, oneOf } from '../../platform/db/columns';

/** One row per consent the owner gave. Revoked rows stay as an audit trail; at most one active row per kind and provider. */
export const grant = sqliteTable(
  'grant',
  {
    id: id(),
    kind: text('kind', { enum: GrantKind.values }).notNull(),
    /** Agent id or browser id. */
    provider: text('provider').notNull(),
    scope: text('scope', { enum: GrantScope.values }).notNull(),
    /** Custom agents: the resolved absolute path and the SHA-256 of the file that was allowed. */
    executablePath: text('executable_path'),
    executableSha256: text('executable_sha256'),
    grantedAt: integer('granted_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    revokedAt: integer('revoked_at'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('grant_active_uq')
      .on(t.kind, t.provider)
      .where(sql`${t.revokedAt} IS NULL`),
    index('grant_kind_idx').on(t.kind),
    oneOf('grant_kind_ck', t.kind, GrantKind.values),
    oneOf('grant_scope_ck', t.scope, GrantScope.values),
  ],
);
