# modules/observability

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: none (writes run_event and application_event owned by runs/applications)
- **Files**: `observability.controller.ts` (IPC), `observability.service.ts`, `observability.repository.ts`, `observability.entity.ts` (contract, exists), `observability.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: LogService (electron-log v5, one scope per module, JSON lines in userData/logs/main.log, 10 MB x 5 archives, `redact()` hook), DiagnosticsService (crash reporter, session.lock unclean-shutdown marker, Help menu log/export actions), RunTraceService (run_event + logs/runs/<run_id>.jsonl), AuditService (application_event). Logs screen and diagnostics export. Every other module logs through LogService.
