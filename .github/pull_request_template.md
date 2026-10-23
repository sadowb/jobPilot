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
- [ ] Feature journey added or extended and run through the packaged app; bug fix includes the regression assertion
- [ ] `npm run verify` passed locally
- [ ] Commit hooks ran (no `--no-verify` / `LEFTHOOK=0`)

## Verification

<!-- Green CI proves it runs, not that it is right. The reviewer merges only after checking these. -->

- [ ] **Renderer change?** Light and dark screenshots (1280x800, realistic data) of every changed screen are in the `screenshots-<run>` CI artifact. Name them here: <!-- e.g. bulk-after-light.png -->
- [ ] **Approved mockup/spec linked in the issue?** Screenshots match it; deviations listed: <!-- or "none" -->
- [ ] **Gentle footprint: no writes outside userData, no new background presence, no changes to the user's tools.** Review [ADR 0016](../docs/adr/0016-gentle-footprint.md), including explicit exports, private agent state, resource limits, Keychain/network boundaries and owned child/tab cleanup on cancel and quit. Evidence or remaining gaps: <!-- list, or "documentation-only; no runtime changes" -->
- [ ] **Trust boundary touched** (IPC, secrets, network, agent output, files)? Listed here for a full-read review: <!-- or "none" -->

## Haiku E2E result

<!-- Journey run against the built app (`e2e/`), pass/fail, and a link to the run output. -->
