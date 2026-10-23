# ADR 0007: Dedicated observability services

- Status: accepted
- Decision: Provide LogService (pino with rotation and redaction), RunTraceService (database and JSONL agent traces), and AuditService (application state changes).
- Rationale: Logs, run traces, and owner-visible audit history have distinct retention and query needs.
- Consequence: Correlation ids are attached where known; secrets and answer contents are excluded from logs.
