# Claude provider verification

`npm run agents:probe` is an assert-based, headless integration script. CI runs it
through `npm test`. It uses the real pinned SDK `query()` and subprocess transport,
a deterministic Claude CLI protocol fixture, and a real stdio MCP server that
fills `form.html` with linkedom. No network listener, browser, GUI, Keychain,
job site, or API credentials are needed. The fixture has no submission tool.

Assertions cover session/text/tool/cost events, key redaction, the subprocess env
allowlist, structured-result validation, invalid output rejection, resume,
pre-abort, abort during streaming, and timeout. The stub CLI emits zero model
usage: **0 input tokens, 0 output tokens, $0**. This is transport/adapter evidence,
not a live Claude model run or a packaged-app feature journey. A live native
executable/MCP/model run and real token cost remain unverified until the tools
installer and secrets composition exist. Do not report fixture usage as live cost.

The provider probe is intentionally not run locally for #38: the owner permits
only typecheck, lint, and format checks locally. Build, packaging, and existing
app journeys run in CI. The feature's packaged-app journey belongs with the run
service/composition wiring; this issue's scope excludes `e2e/` and `modules/*`.
