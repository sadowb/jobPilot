# modules/accounts

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: site_account
- **Files**: `accounts.controller.ts` (IPC), `accounts.service.ts`, `accounts.repository.ts`, `accounts.entity.ts` (contract, exists), `accounts.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Site login metadata (host, username, Bitwarden item id, status). Passwords live in the dedicated Bitwarden account, not here (ADR 0013). The `secret_enc` column is legacy: the Phase 6 PR drops it and adds `bitwarden_item_id` before any real secret is stored.
