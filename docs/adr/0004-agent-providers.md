# ADR 0004: SDK-first agent providers

- Status: accepted
- Decision: Normalize Claude and Codex SDKs, and CLI-only agents through execa, behind `AgentProvider` and a shared zod-validated run result.
- Rationale: The owner can choose coding agents while the app retains one run contract.
- Consequence: Provider events are normalized, final output is parsed before state changes, and each provider receives only its run's environment.

## Claude runtime and authentication (#38)

Pin `@anthropic-ai/claude-agent-sdk` to **0.3.309**. This release's npm
manifest ships platform-specific **native** Claude Code binaries as optional
dependencies, rather than the older `cli.js` subprocess. Its native executable
needs neither a separate system Claude CLI installation nor a Node executable on
the owner's Mac. Electron runs the SDK library; the native process runs the agent.
`RunAsNode` remains off. See [ADR 0015](0015-optional-tools-on-demand.md).

The provider requires an absolute installed executable path and private workspace
and config directory. Provision these under `userData/tools/claude/` when the
owner enables Claude. Never fall back to PATH, `npx`, Electron, or an SDK binary
inside `app.asar`. Missing executable rejects with `tool_not_installed` before
query startup. Tool installation/UI wiring belongs to the on-demand tools phase;
this adapter never downloads or copies executables during a run.

API-key authentication is the owner decision. The main-process composition root
must supply `readApiKey` from `platform/secrets` (Electron safeStorage); it is a
required dependency, with no environment or OAuth fallback. No provider API accepts
a key from the renderer or `RunSpec`. Existing secrets code only stores the DB
key; Claude key storage/composition is a separate wiring requirement until that
platform addition is authorized. The adapter itself never reads OS credentials.

Only `PATH`, `HOME`, `TMPDIR`, `LANG`, and `LC_ALL` are copied from `RunSpec.env`.
The provider sets its private `CLAUDE_CONFIG_DIR` and injects the secrets accessor's
`ANTHROPIC_API_KEY` into the child environment. All other variables (including
OAuth, cloud-provider selectors, API base URL overrides, and Node injection flags)
are dropped. The spawn callback reapplies this environment at the subprocess
boundary. No `process.env` spread is used. SDK errors are reduced to fixed messages,
and the API key is scrubbed from normalized events. Built-in tools are disabled;
only the run's named MCP tools can be granted. User/project settings and ambient
MCP configuration are disabled. The caller supplies the settings-selected model
as `RunSpec.model`, and the service owns persistence/redaction of run content.

Session, text, tool-use/result, final usage, and failure messages map to the
existing `RunEvent` contract. Cost includes cache input tokens and is rounded to
integer microdollars; SDK totals may include earlier resumed-session usage, so
consumers must treat cost events as snapshots rather than increments. Structured
output is requested from the zod JSON Schema and parsed with both the supplied
schema and `RunResultSchema` before resolving. The event iterable must be consumed
to completion; cancellation, timeout, or early iterator close rejects `result`.

Sources: [upstream SDK repository](https://github.com/anthropics/claude-agent-sdk-typescript),
[exact npm manifest](https://unpkg.com/@anthropic-ai/claude-agent-sdk@0.3.309/package.json),
and the installed release's `sdk.d.ts` / `sdk.mjs` (`query`, `Options.env`, native
executable detection, `spawnClaudeCodeProcess`). Checked 2026-10-23.
