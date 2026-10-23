# modules/profile

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: profile, experience, education
- **Files**: `profile.controller.ts` (IPC), `profile.service.ts`, `profile.repository.ts`, `profile.entity.ts` (contract, exists), `profile.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Single owner profile (one row, upsert). Source of truth for pre-filled facts. Validate phone numbers with libphonenumber-js; dates are `YYYY-MM`.
