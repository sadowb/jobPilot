# platform/browsers

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

`types.ts` is the contract (`BrowserProvider`). Backends: `neo.ts` (default, BrowserOS MCP), `playwright.ts`, `embedded.ts`. One tab per run; `closeTab` is idempotent.
