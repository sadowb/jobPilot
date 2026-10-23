import { sql, type SQL } from 'drizzle-orm';
import { check, integer, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulid';

/** ULID text primary key. */
export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => ulid());

/** Unix milliseconds. */
export const createdAt = () =>
  integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now());
export const updatedAt = () =>
  integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now());
export const deletedAt = () => integer('deleted_at');

export const timestamps = () => ({ createdAt: createdAt(), updatedAt: updatedAt() });

/** `col IN ('a','b')` as inline SQL (DDL cannot carry bound params). Values are code constants, never user input. */
export const inList = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} IN (${sql.raw(values.map((v) => `'${v.replaceAll("'", "''")}'`).join(', '))})`;

/** CHECK constraint restricting a text column to a closed set (SQLite has no enums). */
export const oneOf = (name: string, column: AnySQLiteColumn, values: readonly string[]) =>
  check(name, inList(column, values));
