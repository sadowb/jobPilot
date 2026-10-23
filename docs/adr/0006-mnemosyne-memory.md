# ADR 0006: Mnemosyne for agent memory

- Status: accepted
- Decision: Run pinned Mnemosyne as an MCP server over stdio, installed by a bundled pinned `uv` into user data.
- Rationale: Reuse an existing memory system for answers, site quirks, and outcomes instead of maintaining a custom memory store.
- Consequence: First launch requires network access to install the pinned tool; its data directory is separate from the product database.
