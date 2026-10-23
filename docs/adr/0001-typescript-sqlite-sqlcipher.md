# ADR 0001: TypeScript, SQLite, and SQLCipher

- Status: accepted
- Decision: Use TypeScript across Electron processes and SQLite with SQLCipher for local persistence. Keep the encryption key in Keychain / Electron `safeStorage`; enable WAL, foreign keys, and STRICT tables.
- Rationale: The app is single-owner and local-first, so an embedded encrypted database avoids a server while retaining relational integrity.
- Consequence: Native SQLite (`better-sqlite3`, aliased to `better-sqlite3-multiple-ciphers`) must be rebuilt for Electron's ABI and verified in the packaged runtime. Use only the `better-sqlite3` import name so Drizzle's native driver resolves the same module.
