# platform/agents

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

`types.ts` is the contract (`AgentProvider`, `RunSpec`, `RunEvent`, `RunResult`). Backends: `claude.ts` (Claude Agent SDK `query()`), `codex.ts` (@openai/codex-sdk), `cli.ts` (execa, for agy). Map SDK events to `RunEvent`; validate the final output with `spec.outputSchema` (`RunResultSchema` for runs; the posting reader passes its own) before resolving `result`. Honour `signal` and `timeoutMs`. Pass only `spec.env` to the agent.
