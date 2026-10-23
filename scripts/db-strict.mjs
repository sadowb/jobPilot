// drizzle-orm cannot emit SQLite STRICT tables. Append it to every CREATE TABLE in drizzle/*.sql.
// `--check` fails (CI/lefthook) if any table is missing it. Run after `drizzle-kit generate` (npm run db:generate does).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'drizzle';
const check = process.argv.includes('--check');
// A drizzle CREATE TABLE statement ends with a line ");" (a STRICT one with ") STRICT;").
const unstrict = /^\);$/gm;
let bad = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
  const path = join(dir, file);
  const sql = readFileSync(path, 'utf8');
  const creates = sql.split('--> statement-breakpoint').filter((s) => /^\s*CREATE TABLE/.test(s));
  const missing = creates.filter((s) => !/\)\s*STRICT;\s*$/.test(s.trim()));
  if (!missing.length) continue;
  if (check) {
    console.error(`${path}: ${missing.length} CREATE TABLE without STRICT`);
    bad++;
  } else {
    writeFileSync(path, sql.replace(unstrict, ') STRICT;'));
    console.log(`${path}: STRICT applied`);
  }
}
process.exit(bad ? 1 : 0);
