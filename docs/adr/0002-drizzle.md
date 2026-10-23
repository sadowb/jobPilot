# ADR 0002: Drizzle for schema and migrations

- Status: accepted
- Decision: Declare tables in Drizzle entities and generate migrations with drizzle-kit. Keep view SQL in `0001_views.sql`, and append SQLite STRICT to generated table DDL.
- Rationale: Typed entities and generated migrations keep the contract reviewable.
- Consequence: Entity, migration metadata, SQL, DTO enums, and typed view handles must change together; run `npm run db:check`.
