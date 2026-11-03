# modules/grants

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: consent grants (`grant` table): which agent and which browser the owner allowed, for what scope, and when.
- **Files**: `grants.controller.ts` (IPC), `grants.service.ts`, `grants.repository.ts`, `grants.entity.ts` (contract), `grants.gate.ts` (decorators that put the grant check in front of an `AgentProvider` / `BrowserProvider`).
- **Notes**: nothing runs without a grant. The gate wraps the providers in `main.ts`, so `RunsService` and `PostingReader` are covered without knowing about consent. A custom agent's grant stores the resolved path and a SHA-256; a different file or path at that location is not granted. Revoking sets `revoked_at` (the row stays as an audit trail); a re-allow inserts a new row.
