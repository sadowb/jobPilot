# ADR 0015: Optional tools are installed on demand, never bundled

- Status: accepted (2026-10-23). Amends ADR 0005 (browser providers), ADR 0006 (Mnemosyne) and ADR 0013 (Bitwarden).
- Amended by [ADR 0016](0016-gentle-footprint.md): never install or change the owner's tools on their behalf. The Claude provisioning section below is historical where it conflicts; explicit JobPilot-owned MCP installations remain confined to `userData`.
- Decision: The `.app` ships only JobPilot. Every agent-side tool (a browser MCP, memory, the Bitwarden vault) is chosen by the owner in Settings and installed then, pinned, into `userData/tools/<tool>/`. Nothing the owner did not choose is downloaded.

## Why

- The owner picks the browser: Neo (default), Playwright, later the embedded browser. Bundling Playwright and its Chromium (about 150 MB+) for someone who uses Neo is waste, and every bundled tool widens the shipped attack surface.
- Test tooling is a separate concern: `@playwright/test` is a dev dependency used only by CI and `npm run verify`; it is never in `app.asar` (`scripts/verify-shipped.mjs` runs the untouched app).

## The tools

| Tool               | Kind                                       | How it gets on the Mac                                                                                                                                        |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neo (BrowserOS)    | separate app the owner installs            | JobPilot detects its MCP endpoint; if missing, Settings links to the BrowserOS download. JobPilot installs nothing.                                           |
| Playwright browser | `@playwright/mcp` + Chromium               | installed when the owner selects the Playwright provider; Chromium fetched by `playwright install chromium` into the tool folder (`PLAYWRIGHT_BROWSERS_PATH`) |
| Mnemosyne          | Python package                             | pinned `uv` (ADR 0006) installs it on first enable                                                                                                            |
| Bitwarden          | `@bitwarden/cli` + `@bitwarden/mcp-server` | installed when the owner connects the job vault (ADR 0013)                                                                                                    |

## Node runtime for npm-based tools

The shipped app keeps the `RunAsNode` fuse off (asserted by `verify-shipped`), so Electron cannot run tools as Node. ADR 0013's "`ELECTRON_RUN_AS_NODE`" note was wrong and is replaced by this:

- The first npm-based tool the owner enables downloads one pinned official Node LTS (`node-vXX-darwin-arm64.tar.xz` from nodejs.org) into `userData/tools/node/`, verified against a SHA-256 pinned in the app source (not fetched at install time).
- Each npm tool ships a pinned `package.json` + `package-lock.json` in app resources (`resources/tools/<tool>/`). The install runs `npm ci --ignore-scripts` with that Node, so versions and integrity hashes are fixed by the release, not by the registry on install day.
- Claude is an exception to tool installation: it uses the owner-confirmed executable (see below).

## Rules

- **Install is explicit and observable:** Settings shows each tool as `not installed / installing (progress) / ready / failed (retry)`, logs every step via LogService, and an install is atomic (download to a temp folder, verify, then rename into place). A failed or partial install never leaves a half-ready tool.
- **Uninstall** deletes `userData/tools/<tool>/`. Upgrades come only with a JobPilot release that bumps the pin.
- **A run never installs anything.** A provider that is not ready returns `blocked` with reason `tool_not_installed` before the agent starts.
- **Contract change (Phase 7 PR):** `BrowserProvider` gains `status()` and `install(onProgress)`; the same shape is reused by the memory and vault adapters.
- Not chosen: bundling everything (size, attack surface, choices the owner did not make); using the owner's system Node or `npx` at run time (unpinned, may be missing, changes under us).

## Claude is detected, never installed (#67, supersedes #38)

The pinned SDK **library** is an app dependency. Its optional proprietary Claude
Code binaries are excluded from packaging. JobPilot never provisions a copy under
`userData/tools/claude/`, downloads a CLI, updates it, or edits the owner's tools.
The owner installs and signs in to the unmodified CLI independently.

`platform/agents/detect.ts` checks only `--version` (five seconds), resolves an
absolute executable path, and offers it in Settings for one-time confirmation.
The owner can pick the file in a native dialog opened by main (the renderer never sends a path) and re-detect. Runs use the saved path, with a
private workspace under `userData/agents/claude/`, and never auto-install or
re-resolve a tool. Haiku is the persisted default model.

Personal use may select the owner's existing CLI login; distributed builds default
to the API key from #66. Authentication, isolation, no-session-persistence,
cleanup and upstream ToS boundaries are detailed in
[ADR 0004](0004-agent-providers.md#claude-runtime-and-authentication-67-supersedes-38).
The pinned Node runtime remains a separate requirement for npm-based MCP tools;
Claude itself is never obtained through that installer.
