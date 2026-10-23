import { blob, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { SiteAccountStatus } from '../../../shared/dto';
import { deletedAt, id, oneOf, timestamps } from '../../platform/db/columns';

/** A login the agent may use on a career site. The secret never leaves main; it is shown only after Touch ID. */
export const siteAccount = sqliteTable(
  'site_account',
  {
    id: id(),
    host: text('host').notNull(),
    username: text('username').notNull(),
    /** safeStorage-encrypted password. */
    secretEnc: blob('secret_enc', { mode: 'buffer' }).notNull(),
    status: text('status', { enum: SiteAccountStatus.values }).notNull().default('unknown'),
    lastLoginAt: integer('last_login_at'),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex('site_account_host_username_live_uq')
      .on(t.host, t.username)
      .where(sql`${t.deletedAt} IS NULL`),
    index('site_account_host_idx').on(t.host),
    oneOf('site_account_status_ck', t.status, SiteAccountStatus.values),
  ],
);
