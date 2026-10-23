# modules/analytics

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: view v_analytics_funnel (no tables)
- **Files**: `analytics.controller.ts` (IPC), `analytics.service.ts`, `analytics.repository.ts`, `analytics.entity.ts` (contract, exists), `analytics.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Read-only aggregations over the views. No writes.
