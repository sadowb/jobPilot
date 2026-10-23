# modules/settings

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: settings (key/value JSON)
- **Files**: `settings.controller.ts` (IPC), `settings.service.ts`, `settings.repository.ts`, `settings.entity.ts` (contract, exists), `settings.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Typed settings: one zod schema per key. The theme preference currently lives in a file (`settings.service.ts`); Phase 1 moves it into the `settings` table.
