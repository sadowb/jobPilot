# platform/memory

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

Mnemosyne via MCP stdio. Installs a pinned `uv`, then `uv tool install mnemosyne-memory==<pinned>` into userData/tools with `MNEMOSYNE_DATA_DIR=userData/mnemosyne`; exposes `mcpServerConfig()`. Needs network on first launch: show progress and retry.

Files: `types.ts` (`MemoryProvider`, `MEMORY_TOOLS`), `mnemosyne.ts` (real installer: uv 0.13.6 verified by sha256, `uv tool install mnemosyne-memory[mcp]==4.0.0` into `userData/tools/mnemosyne/`, data in `userData/mnemosyne/`), `fake.ts` (E2E seam, no network). Agents may call only `MEMORY_TOOLS` (`RunSpec.toolAllowlist`): Mnemosyne's export/import/media tools reach outside userData. Nightly `mnemosyne sleep` is `platform/queue/consolidate.ts`. Bump the pins only with a JobPilot release and re-run the install by hand.
