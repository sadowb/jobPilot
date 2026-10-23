# platform/memory

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

Mnemosyne via MCP stdio. Installs a pinned `uv`, then `uv tool install mnemosyne-memory==<pinned>` into userData/tools with `MNEMOSYNE_DATA_DIR=userData/mnemosyne`; exposes `mcpServerConfig()`. Needs network on first launch: show progress and retry.
