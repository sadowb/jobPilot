# modules/runs

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: run, run_event, approval
- **Files**: `runs.controller.ts` (IPC), `runs.service.ts`, `runs.repository.ts`, `runs.entity.ts` (contract, exists), `runs.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Owns run lifecycle: queue runs by leaving them `queued` (the `run` table is the queue; `ApplyWorker` slots claim them atomically, ADR 0017). Startup requeues `running` rows under 3 attempts for a native Claude session resume and fails the rest, then starts the queue paused (`runs.paused`, also set by an owner pause or by a quit that re-queued in-flight runs) until the owner resumes; a heartbeat (`progress_at`) feeds the stuck watchdog, which moves a silent run to `needs_you`, call the AgentProvider + BrowserProvider, validate `RunResult` with zod, apply the transition. Submit requires an `approval` bound to `form_hash` unless auto mode is on. One active run per application is enforced by the partial unique index; handle its violation as "already running", not as a crash.
