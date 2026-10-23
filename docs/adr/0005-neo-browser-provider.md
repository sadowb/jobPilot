# ADR 0005: Neo as the default browser

- Status: accepted
- Decision: Use Neo as the default browser through a `BrowserProvider` interface that exposes MCP configuration and per-run tab lifecycle.
- Rationale: Agents retain their full built-in browser capability while Neo adds a separate browser connection.
- Consequence: One tab belongs to each run; alternative Playwright and embedded providers can implement the same contract later. Non-default providers are installed only when the owner selects them (ADR 0015); Neo is a separate app the owner installs.
