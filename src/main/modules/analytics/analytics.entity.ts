import { integer, sqliteView } from 'drizzle-orm/sqlite-core';

/** Typed handle for `v_analytics_funnel` (single row; see drizzle/). Keep in sync with the view SQL. */
export const vAnalyticsFunnel = sqliteView('v_analytics_funnel', {
  total: integer('total').notNull(),
  applied: integer('applied').notNull(),
  replied: integer('replied').notNull(),
  interviewing: integer('interviewing').notNull(),
  offers: integer('offers').notNull(),
  rejected: integer('rejected').notNull(),
  spendMicros: integer('spend_micros').notNull(),
}).existing();
