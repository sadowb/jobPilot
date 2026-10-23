import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { updatedAt } from '../../platform/db/columns';

/** Key/value app settings. The key is the primary key; values are JSON validated per key by SettingsService. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: updatedAt(),
});
