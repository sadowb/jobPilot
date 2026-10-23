# ADR 0004: SDK-first agent providers

- Status: accepted
- Decision: Normalize Claude and Codex SDKs, and CLI-only agents through execa, behind `AgentProvider` and a shared zod-validated run result.
- Rationale: The owner can choose coding agents while the app retains one run contract.
- Consequence: Provider events are normalized, final output is parsed before state changes, and each provider receives only its run's environment.

## Claude runtime and authentication (#67, supersedes #38)

Keep the SDK library pinned to **0.3.309**, but never ship, download, copy or
launch its optional native CLI packages. JobPilot detects the owner's installed,
unmodified `claude`, like a plugin. Discovery uses the login-shell PATH and
`~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`; candidates run only
`--version`, with a five-second timeout. A manual override must be absolute,
executable and respond to the same check. Settings records the resolved absolute
path and version after owner confirmation. Runs never search PATH.

Settings owns the model (`haiku` by default), authentication choice, confirmation
and runtime login state. `--version` does not prove authentication: the initial
login state is explicitly **unverified**, not a false claim of readiness. A CLI
`authentication_failed` event changes Settings to **not logged in** and directs
the owner to “Open Terminal and run `claude` once to sign in”. Re-detect and
confirmation allow retry after signing in. JobPilot never launches a login flow
or reads login credentials itself. Missing tools and known authentication issues
block run creation; authentication failure during a run needs owner intervention,
rather than a generic failed run.

For this owner's personal build, using their own CLI login is the owner decision.
Without an API key the provider sets neither `ANTHROPIC_API_KEY` nor
`CLAUDE_CONFIG_DIR`: the unmodified CLI finds its own login. Packaged/distributed
builds default to API-key authentication through #66, with a private config
under `userData/agents/claude/config/`. A saved key is read only in main through
`platform/secrets`; no key is accepted from a run or renderer. The provider's
`readApiKey` dependency is optional, and an unavailable explicitly selected key
fails closed instead of silently billing a subscription.

This is a product boundary, not a blanket legal assurance. Anthropic distinguishes
ordinary personal CLI use from third-party SDK products; distributed products
must use the API-key default and comply with the applicable terms. JobPilot does
not collect, store or intermediate subscription tokens. See the upstream
[authentication and credential rules](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use).

Only `PATH`, `HOME`, `TMPDIR`, `LANG`, `LC_ALL`, `USER` and `LOGNAME` are copied
from the run environment. The provider adds `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`
and, only in API-key mode, the key and private config directory. The spawn callback
reapplies this exact environment. OAuth variables, endpoint overrides and injection
flags are dropped. Errors use fixed messages; nonempty API keys are scrubbed from
events and diagnostics.

The workspace stays under `userData/agents/claude/`. Each run disables filesystem
settings (`settingSources: []`), ambient MCP (`strictMcpConfig: true`), built-in
tools (`tools: []`), and grants only named run MCP tools (plus structured output)
through `canUseTool`. This excludes personal hooks, plugins and CLAUDE.md. Host
managed policy and the CLI's own global login config remain upstream inputs:
[SDK isolation limits](https://code.claude.com/docs/en/agent-sdk/claude-code-features#what-settingsources-does-not-control).
We do not modify the owner's files to disable those inputs.

`persistSession: false` passes `--no-session-persistence` on every run. No local
session history is available for later resumption; future Inbox continuation must
reconstruct context from JobPilot's own records. Abort, timeout, iterator close
and quit kill the run process group, including stdio MCP children. Runs create no
login items, tray, global shortcuts, listeners or telemetry.

`scripts/probe-claude.mts` uses the fake CLI exclusively. It checks detection,
keyless/keyed environments, isolation flags with fake personal hooks/MCP/settings,
session persistence flags and process exit after cancel, timeout and stop/quit.
It verifies the SDK transport contract, not proprietary CLI internals or live
Keychain behavior. Packaged Settings journeys exercise persistence, model
propagation, authentication errors and light/dark screenshots in CI.

Final output is parsed with both the supplied schema and `RunResultSchema` before
state changes. Events normalize session, messages, tools, usage and errors. Cost
events are snapshots (SDK totals may include prior resumed usage), not increments.
The event iterable must be consumed to completion; incomplete streams reject the
result.
