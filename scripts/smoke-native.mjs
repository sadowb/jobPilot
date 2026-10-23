// Run under Electron's Node ABI: ELECTRON_RUN_AS_NODE=1 electron scripts/smoke-native.mjs  (npm run smoke:native)
// Proves the native SQLCipher module loads, encryption is on, and the migrations apply (STRICT, CHECKs, partial indexes, views).
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3-multiple-ciphers';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const dir = mkdtempSync(join(tmpdir(), 'jobpilot-smoke-'));
const file = join(dir, 'db.sqlite');
const open = (key) => {
  const db = new Database(file);
  db.pragma("cipher='sqlcipher'");
  db.pragma("key='" + key + "'");
  db.pragma('foreign_keys = ON');
  return db;
};
try {
  const db = open('smoke-key');
  migrate(drizzle(db), { migrationsFolder: 'drizzle' });
  const tables = db
    .prepare(
      "SELECT COUNT(*) n FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations'",
    )
    .get().n;
  assert.equal(tables, 22);
  const lax = db
    .prepare(
      "SELECT name FROM pragma_table_list WHERE schema='main' AND type='table' AND strict=0 AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations'",
    )
    .all();
  assert.deepEqual(lax, [], 'every table must be STRICT');
  for (const v of ['v_application_list', 'v_up_next', 'v_inbox', 'v_analytics_funnel'])
    db.prepare(`SELECT * FROM ${v}`).all();

  const now = Date.now();
  db.prepare("INSERT INTO company (id,name,name_key,created_at,updated_at) VALUES ('c1','Acme','acme',?,?)").run(
    now,
    now,
  );
  db.prepare(
    "INSERT INTO job_posting (id,company_id,url,canonical_url,ats,title,created_at,updated_at) VALUES ('p1','c1','u','u','custom','Dev',?,?)",
  ).run(now, now);
  db.prepare(
    "INSERT INTO application (id,posting_id,queue_rank,last_activity_at,created_at,updated_at) VALUES ('a1','p1',1,?,?,?)",
  ).run(now, now, now);
  const run = db.prepare(
    "INSERT INTO run (id,application_id,agent,browser,created_at,updated_at) VALUES (?,'a1','claude','neo',?,?)",
  );
  run.run('r1', now, now);
  assert.throws(() => run.run('r2', now, now), /UNIQUE/, 'second active run must be rejected');
  db.prepare("UPDATE run SET status='failed' WHERE id='r1'").run();
  run.run('r2', now, now); // allowed once the first is terminal
  assert.throws(() => db.prepare("UPDATE application SET status='bogus'").run(), /CHECK/);
  assert.throws(
    () =>
      db
        .prepare("INSERT INTO company (id,name,name_key,created_at,updated_at) VALUES (1,'x','x','not-an-int',0)")
        .run(),
    { code: 'SQLITE_CONSTRAINT_DATATYPE' },
    'STRICT must reject text in an integer column',
  );
  assert.equal(db.prepare('SELECT latest_run_id FROM v_application_list').get().latest_run_id, 'r2');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM v_up_next').get().n, 1);
  db.close();

  assert.ok(!readFileSync(file).subarray(0, 15).toString().startsWith('SQLite format 3'), 'file must not be plaintext');
  const wrong = open('wrong-key');
  assert.throws(() => wrong.prepare('SELECT 1 FROM company').get(), /not a database|file is not/i);
  console.log(
    `ok: electron ${process.versions.electron}, node ${process.version}, sqlite ${new Database(':memory:').prepare('select sqlite_version() v').get().v}`,
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
