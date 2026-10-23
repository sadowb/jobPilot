# Neo browser adapter

Source checked against BrowserOS commit `512f9cc15962b00b65b2cb35c429ed3134764f84`:

- [Neo MCP setup](https://github.com/browseros-ai/BrowserOS/blob/512f9cc15962b00b65b2cb35c429ed3134764f84/docs/neo/mcp/index.mdx): local Streamable HTTP endpoint, default `http://127.0.0.1:9200/mcp`.
- [Tabs implementation](https://github.com/browseros-ai/BrowserOS/blob/512f9cc15962b00b65b2cb35c429ed3134764f84/packages/browseros-agent/crates/browseros-mcp/src/tools/tabs.rs): `tabs` with `action: new | list | close`; creation returns `structuredContent.page` (u32), list returns `structuredContent.pages`, close takes `page`.
- [MCP transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports): initialization, session header, JSON and SSE responses.
- [Install Neo](https://github.com/browseros-ai/BrowserOS/blob/512f9cc15962b00b65b2cb35c429ed3134764f84/docs/neo/install.mdx). JobPilot downloads, installs, and launches nothing.

## Integration boundary

`NeoBrowserProvider` implements the existing contract. Its concrete `status()` returns `installed` when the endpoint exposes `tabs`, `not_running` when unreachable but the app exists in `/Applications` or `~/Applications`, otherwise `not_installed`. `installHint` directs the owner to install/open Neo. A nonstandard install location or an incompatible/unhealthy endpoint can appear as unavailable; status is a readiness hint, not a process inventory. No shared contract was extended.

The constructor accepts an owner-configured numeric loopback HTTP endpoint. Redirects are rejected. JobPilot creates no server/listener. The existing HTTP MCP contract forwards that endpoint to the agent; Neo owns the external listener. This is the Neo exception to the stdio default in the architecture overview.

The future main-process run service must load the posting through the postings service and pass **the DB row's `canonical_url`** to `openTab(runId, canonical_url)`. Never expose the method as URL-taking IPC. This adapter neither reads the DB nor imports modules. There are no provider callers in this change: queue/run orchestration remains a separate task. The adapter rejects non-HTTPS URLs and embedded credentials before any MCP call. This gate applies to initial navigation; Neo/agent navigation and site redirects need their own policy.

One provider instance owns the run-to-tab map. Keep it alive across runs and call `closeTab` in run cleanup. Concurrent operations are serialized; repeat opens return the tracked tab and never navigate it again. Close first lists pages so a tab manually closed by the owner is harmless. Failed close retains tracking for retry. MCP errors omit server/page text.

Tracking is in memory. Restarting JobPilot loses ownership; do not close arbitrary pre-existing tabs. A timed-out/lost creation response can leave an untracked Neo tab: inspect and close it manually before retrying. Creation is never automatically replayed. A stale MCP session (404) fails that operation and is reinitialized on the next call. Agent connections have independent Neo sessions; provide the returned tab id in the run prompt, and verify cross-session tab access with the installed Neo version before wiring agents. The provider does not sandbox the agent's other browser tools.

## Owner verification (requires explicit live Neo use)

Local implementation checks are limited to `npm run typecheck`, `npm run lint`, and `npm run format:check`. Builds and packaged app journeys run in CI. The live probe was deliberately not run on the development Mac (no GUI or Keychain access).

1. Install/open Neo yourself, enable MCP, and copy the endpoint from its MCP sidebar. Use a disposable browser profile.
2. Read a public HTTPS `canonical_url` from a disposable posting in the JobPilot DB using your normal owner tooling. Do not use a private/tokenized URL or paste secrets.
3. From the checkout, run `node src/main/platform/browsers/probe.mjs 'https://your-public-posting-url'`. If needed, set `NEO_MCP_URL` to the numeric loopback endpoint. The probe transpiles only the adapter to temporary files, without building/launching Electron, reading the DB, or accessing Keychain.
4. The assert-based dry run rejects HTTP/file/javascript URLs, checks concurrent opens return the same tab id, checks two runs get distinct tabs, and closes both, including duplicate closes. Confirm Neo did not create extra tabs or disturb existing tabs.
5. Separately open a tracked tab, close it manually, then call `closeTab` twice; neither should fail. With Neo quit, `status()` should be `not_running` at a standard install location. On a clean machine with no Neo, expect `not_installed` and the install hint; verify nothing is installed or launched.
6. During later run-service integration, add the packaged-app journey under `e2e/`: start from a persisted posting, assert its canonical URL is used, verify per-run tab lifecycle and unavailable-tool blocking. That integration is outside this issue's `platform/browsers + docs` scope; existing CI app journeys do not exercise this unwired provider.
