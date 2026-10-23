# modules/accounts

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: site_account
- **Files**: `accounts.controller.ts` (IPC), `accounts.service.ts`, `accounts.repository.ts`, `accounts.entity.ts` (contract, exists), `accounts.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Site logins. Passwords are encrypted with `safeStorage` and stored in `secret_enc`; reveal only after Touch ID; hand an agent a secret only for the matching `host`. Never log or return `secret_enc` to the renderer.
