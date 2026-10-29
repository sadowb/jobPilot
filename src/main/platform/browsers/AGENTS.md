# platform/browsers

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

`types.ts` is the contract (`BrowserProvider`). Backends: `neo.ts` (default, BrowserOS MCP), `playwright.ts`, `embedded.ts`. One tab per run; `closeTab` is idempotent.

Neo agent tools (`mcpServerConfig`, scoped to the run's own tab): `snapshot`, `fill`, `click`, `scroll`. `click` takes a ref from the latest snapshot and refuses final actions (`FINAL_ACTION`: submit, send, pay, delete, sign out). No URL navigation, scripts, downloads or credentials.
