# ADR 0003: liteque for application runs

- Status: superseded by [ADR 0017](0017-run-table-as-queue.md)
- Amended by [ADR 0016](0016-gentle-footprint.md) and 2026-10-23 decision ([#88](https://github.com/sadowb/jobPilot/issues/88)): default concurrency is restored to six parallel runs.
- Decision: Use liteque's persistent queue for application work with configurable concurrency (default six). Enforce one active run per application with a partial unique index.
- Rationale: It provides persistent local jobs without a service dependency.
- Consequence: Queue state and run state must be reconciled on startup and cancellation.
