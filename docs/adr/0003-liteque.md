# ADR 0003: liteque for application runs

- Status: accepted
- Decision: Use liteque's persistent queue for application work with configurable concurrency (default six). Enforce one active run per application with a partial unique index.
- Rationale: It provides persistent local jobs without a service dependency.
- Consequence: Queue state and run state must be reconciled on startup and cancellation.
