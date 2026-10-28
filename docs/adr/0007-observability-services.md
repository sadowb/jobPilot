# ADR 0007: Dedicated observability services

- Status: accepted
- Decision: Provide LogService (electron-log v5 with rotation and redaction; replaced pino in #165), RunTraceService (database and JSONL agent traces), and AuditService (application state changes).
- Rationale: Logs, run traces, and owner-visible audit history have distinct retention and query needs.
- Consequence: Correlation ids are attached where known; secrets and answer contents are excluded from logs.
