# modules/observability

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: none (writes run_event and application_event owned by runs/applications)
- **Files**: `observability.controller.ts` (IPC), `observability.service.ts`, `observability.repository.ts`, `observability.entity.ts` (contract, exists), `observability.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: LogService (pino root + child per module, pino-roll rotation, redaction), RunTraceService (run_event + logs/runs/<run_id>.jsonl), AuditService (application_event). Logs screen and diagnostics export. Every other module logs through LogService.
