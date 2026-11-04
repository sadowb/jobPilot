# platform/browsers

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

`types.ts` is the contract (`BrowserProvider`). Backends: `neo.ts` (default, BrowserOS MCP), `playwright.ts`, `embedded.ts`. One tab per run; `closeTab` is idempotent. `formSnapshot(runId)` returns the form hash and field values from one read of the owned tab.

Neo agent tools (`mcpServerConfig`, scoped to the run's own tab): `snapshot`, `fill`, `click`, `scroll`. `click` takes a ref from the latest snapshot and refuses final actions: `NEVER_ACTION` (pay, delete, sign out, ...) always; `SUBMIT_ACTION` (submit, send, confirm, finish) unless the run's MCP was built with a `SubmitAuthorisation` (the approval path, ADR 0020), and then only after a fresh snapshot hashes to the approved `formHash`, the ref is still a submit button, and the durable one-time `claim()` succeeds. No URL navigation, scripts, downloads or credentials.
