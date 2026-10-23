# modules/applications

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: application, application_answer, application_event; views v_application_list, v_up_next
- **Files**: `applications.controller.ts` (IPC), `applications.service.ts`, `applications.repository.ts`, `applications.entity.ts` (contract, exists), `applications.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: State machine for `application.status`; every transition writes an `application_event` row (AuditService helper). Owns queue ordering (`queue_rank`). Creating an application from a posting is idempotent (one live application per posting).
