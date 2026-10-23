## What
<!-- One or two sentences: what changed. -->

## Why
<!-- The problem or the architecture-doc section this implements (link docs/architecture.md#...). -->

## Modules touched
<!-- e.g. modules/runs, platform/agents. Stay inside your assigned folders; list anything outside and why. -->

## Ponytail notes
- **Skipped on purpose:**
- **Known risks / unverified:**

## Checks
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:check` green
- [ ] Schema change? Migration generated with `npm run db:generate`, entities and `shared/dto` updated together
- [ ] Logs go through LogService (no `console.*`), secrets never logged
- [ ] No unit tests added (see ADR 0011); behaviour covered by a Haiku E2E journey

## Haiku E2E result
<!-- Journey run against the built app (`e2e/`), pass/fail, and a link to the run output. -->
