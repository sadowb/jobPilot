# Contributing to JobPilot

Thanks for your interest. JobPilot is in early development and is run by one maintainer ([@sadowb](https://github.com/sadowb)), so the process below is built to keep reviews small and safe. Read it once before opening an issue or PR.

## Before you start

- **Open or pick an issue first.** Use one of the forms (Bug, Feature, Agent task); blank issues are disabled. Write acceptance criteria someone can observe in the running app. A PR without an agreed issue may be closed, except for typo-level docs fixes.
- **Security problems are not issues.** Follow [SECURITY.md](SECURITY.md).
- **Read the rules.** [AGENTS.md](AGENTS.md) is binding for humans and coding agents alike, plus the `AGENTS.md` in any folder you edit. The design lives in [docs/architecture.md](docs/architecture.md) and [docs/adr/](docs/adr/). A change that contradicts an accepted ADR needs a new ADR in the same PR.
- Good starting points carry the `good first issue` or `help wanted` labels.

## Set up

Requirements: macOS on Apple silicon, Node 22.12+, Git. Full command list in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

```bash
git clone https://github.com/sadowb/jobPilot.git
cd jobPilot
npm ci            # lefthook installs the git hooks (else: npx lefthook install)
npm run dev       # Electron with hot reload
```

The `app` CI job builds and runs journeys on macOS; Windows and Linux are packaged at release only.

## Make the change

- **Branch from `main`**, one branch per issue: `issue-<n>-<short-slug>` (for example `issue-42-retry-backoff`).
- **Stay in scope.** Touch only the folders the issue names. Contract files (`*.entity.ts`, `src/shared/dto`, `platform/*/types.ts`) change only in a PR whose title says so.
- **Layering:** `controller -> service -> repository -> entity`, no skipping, no imports back up. Cross-module calls go through the other module's service. See [AGENTS.md](AGENTS.md#layering-enforced-in-review).
- **Trust boundaries:** parse every IPC payload, agent output, HTTP/ATS response and file read with zod before use. Never trust the renderer.
- **Gentle footprint ([ADR 0016](docs/adr/0016-gentle-footprint.md)):** write only inside `userData`, never change the user's tools or config, no background presence, no telemetry, no new network destinations.
- **Logging and secrets:** no `console.*` in `src/main`; use the module's pino logger. Never log secrets, cookies or personal answers. Secrets go through `platform/secrets` only.
- **Database:** edit the entity, run `npm run db:generate`, commit the SQL and `drizzle/meta`, update `src/shared/dto`. Never hand-edit an existing migration.
- **Minimal code:** prefer the platform or an existing dependency over a new helper; no abstraction without a second caller. A known shortcut gets `// shortcut: <limit>, <when to upgrade>`.
- **New dependencies** need a reason in the PR. Pin an exact version; `npm audit --audit-level=high` must stay clean.

## Tests

JobPilot does not use unit tests ([ADR 0011](docs/adr/0011-no-unit-tests.md)). Behaviour is verified by Playwright `_electron` journeys in [`e2e/`](e2e/AGENTS.md) against the built app:

- A **feature** adds or extends a journey that drives it through the app.
- A **bug fix** adds the assertion that would have caught the bug.
- A **renderer change** saves light and dark screenshots (1280x800, realistic data) of every changed screen; CI uploads them for review against the approved mockup.
- A test that passes only on rerun is a bug: open a `flaky` issue. Never `.skip` and never add retries.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), because [release-please](docs/RELEASE.md) builds the changelog and version from them:

```
feat(postings): read custom career sites with the agent
fix(db): detect damaged database and restore from backup
docs: add contributing guide
```

Use `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci` or `chore`, scoped to the module where one applies. `feat!:` or a `BREAKING CHANGE:` footer marks a breaking change. Do not bypass the hooks (`--no-verify`, `LEFTHOOK=0`). If an AI tool wrote part of the change, keep its `Co-Authored-By` trailer.

## Open the pull request

1. Run the full gate locally. It mirrors CI (typecheck, lint, format, gitleaks, audit, DB and IPC manifest checks, build, packaged app, journeys):

   ```bash
   npm run verify
   ```

   It needs [`gitleaks`](https://github.com/gitleaks/gitleaks) on your `PATH` (`brew install gitleaks`). If you cannot run part of it, say which part in the PR.

2. Open the PR against `main` and fill in **every** section of the [template](.github/pull_request_template.md). Link the issue with `Fixes #<n>`.
3. In **Ponytail notes**, list what you skipped on purpose and what you could not verify. An honest gap is fine; a hidden one is not.
4. Name any trust boundary you touched (IPC, secrets, network, agent output, files). Those files get a full read in review; the rest is skimmed.

## Review and merge

- Required checks: `static` (types, lint, format, secret scan, audit, Semgrep, Electronegativity, OSV-Scanner, zizmor) and `app` (build, packaged app, journeys) must be green.
- Green CI proves it runs, not that it is right. The reviewer also reads CodeQL alerts, annotations, Dependabot notes and the screenshots before merging.
- PRs are squash-merged, so the PR title becomes the commit on `main` and must follow Conventional Commits.
- Keep the PR small and focused. Address review comments with new commits; do not force-push over a review in progress.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE) that covers this project.
