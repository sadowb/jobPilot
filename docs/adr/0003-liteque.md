# ADR 0003: liteque for application runs

- Status: accepted
- Amended by [ADR 0016](0016-gentle-footprint.md): the default becomes two parallel runs pending base-Mac calibration; the six-run default below is historical.
- Decision: Use liteque's persistent queue for application work with configurable concurrency (default six). Enforce one active run per application with a partial unique index.
- Rationale: It provides persistent local jobs without a service dependency.
- Consequence: Queue state and run state must be reconciled on startup and cancellation.
