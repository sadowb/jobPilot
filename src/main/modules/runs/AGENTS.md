# modules/runs

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: run, run_event, approval
- **Files**: `runs.controller.ts` (IPC), `runs.service.ts`, `runs.repository.ts`, `runs.entity.ts` (contract, exists), `runs.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Owns run lifecycle: enqueue on the in-memory `apply` queue (the `run` table is authoritative; startup fails interrupted runs and re-enqueues `queued` ones, ADR 0017), call the AgentProvider + BrowserProvider, validate `RunResult` with zod, apply the transition. Submit requires an `approval` bound to `form_hash` unless auto mode is on. One active run per application is enforced by the partial unique index; handle its violation as "already running", not as a crash.
