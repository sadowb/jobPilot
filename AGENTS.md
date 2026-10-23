# AGENTS.md

Rules for every coding agent working in this repo. Source of truth for the design: [docs/architecture.md](docs/architecture.md) and [docs/adr/](docs/adr/). Library docs: [docs/reference/](docs/reference/README.md). Read the `AGENTS.md` in the folder you work in before editing it.

## Layout

```
src/main/app/            bootstrap, windows, security, app:// protocol. No business logic.
src/main/modules/<name>/ one folder per feature: <name>.controller.ts  .service.ts  .repository.ts  .entity.ts  .dto.ts
src/main/platform/       cross-cutting infrastructure: db, queue, agents, browsers, memory, secrets, ipc
src/preload/             contextBridge only
src/shared/              IPC channel names + `dto/` (zod schemas, enums, row types) imported by main, preload and renderer
src/renderer/            React UI. Owned by the UI track; do not touch unless your task says so.
drizzle/                 generated migrations (never hand-edit 0000; views live in 0001_views.sql)
e2e/                     Playwright `_electron` journeys
```

## Layering (enforced in review)

`controller -> service -> repository -> entity`. Nothing skips a layer or points back up.

- **controller**: registers IPC handlers via `platform/ipc` (`defineHandler(channel, zodSchema, fn)`). Parses input, calls one service, returns a DTO. No SQL, no business rules.
- **service**: business rules, state-machine transitions, transactions. The only layer that calls other modules' services.
- **repository**: the only layer that talks to Drizzle. Returns plain rows/DTOs.
- **entity**: Drizzle tables only.
- A module never imports another module's repository or entity (the cross-table FKs in `*.entity.ts` and the aggregate in `platform/db/schema.ts` are the exception). Cross-module calls go through the other module's service.
- `platform/*` never imports from `modules/*` or `app/*`. `src/shared` never imports from `src/main` or `src/renderer`.

## Rules

- **Trust boundaries**: every IPC payload, agent output, ATS/HTTP response and file read is parsed with zod before use. Never trust the renderer.
- **Database**: SQLite STRICT tables, ULID text ids, integer unix-ms timestamps, `deleted_at` only where soft delete is needed. Change an entity, then `npm run db:generate` (adds STRICT), commit the SQL + `drizzle/meta`, update `shared/dto` and the typed view handles. `npm run db:check` must pass.
- **Logging**: no `console.*` in `src/main`. Use the module's pino child logger (LogService) with `run_id`, `application_id`, `job_id`, `agent` fields where known. Never log secrets, cookies, passwords, answers' personal data beyond ids.
- **Secrets**: the DB key only through `platform/secrets` (Keychain / `safeStorage`). Job-site passwords only in the dedicated Bitwarden vault via its MCP (ADR 0013), never in the DB. No secret in env files, logs, run traces or the renderer.
- **No network listeners.** IPC only; MCP servers run over stdio.
- **No unit tests** (ADR 0011). Verification = typecheck, lint, build, and Haiku Playwright journeys in `e2e/` against the built app.
- **Feature and bug coverage**: every feature PR adds or extends an `e2e/` journey that drives the feature through the packaged app; bug fixes add the journey assertion that would have caught the bug. Run `npm run verify` before every PR.
- **Gentle footprint** (owner rule; ADR in #70): JobPilot is a guest on the user's Mac. Write only inside `userData` (plus files the user explicitly exports). Never modify the user's installed tools or their config (`~/.claude`, settings, plugins, PATH, shell rc); detect tools with `--version` only. Add no background presence (login item, LaunchAgent, tray, global shortcut). Kill child processes and close browser tabs on cancel and quit. No telemetry.
- **Verification before merge**: green CI proves it runs, not that it is right. Renderer changes ship light and dark screenshots as CI artifacts (see `e2e/AGENTS.md`) and are compared to the approved mockup. Agent and tester reports are claims until reproduced.
- **Minimal code**: use a library or the platform before writing helpers; no abstractions without a second caller; comment only the non-obvious why. A shortcut with a known limit gets `// shortcut: <limit>, <when to upgrade>`.
- **Stay in your lane**: touch only the folders your task names. Contract files (`*.entity.ts`, `shared/dto`, `platform/*/types.ts`) change only in a PR that says so in its title.

## PR flow (ADR 0010)

1. Branch from `main`, one worktree per task. Conventional Commits; end commit messages with the `Co-Authored-By` line your tool gives you.
2. Run `npm run typecheck && npm run lint && npm run build` (+ `npm run db:check` if you touched the schema). lefthook runs most of this on commit.
3. Open the PR with the template (`gh pr create --repo sadowb/jobPilot`). Fill the ponytail notes honestly: what you skipped, what you could not verify.
4. The reviewer session checks the diff against the architecture doc, this file and ponytail, then approves. Merge only after CI is green and the Haiku E2E result is posted.
