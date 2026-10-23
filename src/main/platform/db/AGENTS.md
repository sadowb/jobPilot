# platform/db

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

Encrypted SQLite (`better-sqlite3` npm alias to better-sqlite3-multiple-ciphers, SQLCipher; key from `platform/secrets`), WAL, `foreign_keys = ON`, drizzle migrator run transactionally at boot after encrypted `VACUUM INTO` backups. `columns.ts` (id/timestamp helpers) and `schema.ts` (aggregate of all entities) are the contract. Migrations: `npm run db:generate` / `db:check`.
