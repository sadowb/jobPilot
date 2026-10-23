# ADR 0004: SDK-first agent providers

- Status: accepted
- Decision: Normalize Claude and Codex SDKs, and CLI-only agents through execa, behind `AgentProvider` and a shared zod-validated run result.
- Rationale: The owner can choose coding agents while the app retains one run contract.
- Consequence: Provider events are normalized, final output is parsed before state changes, and each provider receives only its run's environment.
