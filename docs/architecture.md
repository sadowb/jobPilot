# JobPilot architecture

JobPilot is a local-first Electron desktop app for one owner. The renderer presents the V17 UI; the main process owns data, orchestration, state transitions, credentials, and submission. JobPilot opens no network listeners. Agent MCP servers use stdio, except the externally installed Neo app: JobPilot connects as a client to its loopback Streamable HTTP endpoint ([adapter reference](reference/neo.md)).

## System overview

```mermaid
flowchart LR
  Owner[Owner] --> Renderer[React renderer]
  Renderer -->|typed IPC: zod + sender origin check| Preload[Context bridge]
  Preload --> Main[Electron main process]
  Main --> Modules[Feature modules]
  Modules --> DB[(SQLCipher SQLite<br/>Drizzle + migrations)]
  Modules --> Queue[in-memory apply queue]
  Queue --> Agents[AgentProvider]
  Agents --> Claude[Claude Agent SDK]
  Agents --> Codex[Codex SDK]
  Agents --> CLI[CLI adapters via execa]
  Agents --> Browser[BrowserProvider: Neo]
  Agents --> Memory[Mnemosyne MCP via on-demand uv (ADR 0015)]
  Modules --> Secrets[Keychain / safeStorage: DB key]
  Agents --> Vault[Bitwarden MCP: dedicated job-site vault]
  Modules --> Logs[LogService + RunTraceService + AuditService]
  Browser --> Sites[ATS / career sites]
  Modules --> Mail[Email provider]
```

## Run state machine

The run row is authoritative. The application service applies validated agent results and owns every transition. A partial unique index permits at most one `queued` or `running` run per application. Submission requires a pending approval bound to the current form hash unless auto mode is explicitly enabled.

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> running
  running --> needs_you
  running --> owner_in_control
  owner_in_control --> running
  needs_you --> running
  running --> awaiting_approval
  awaiting_approval --> submitted
  running --> failed
  queued --> failed
  needs_you --> failed
  owner_in_control --> failed
  awaiting_approval --> failed
```

`needs_you` represents an owner answer or intervention. `owner_in_control` represents an active takeover. The agent result vocabulary (`filled`, `needs_answers`, `blocked`, `submitted`, `failed`) is an input contract; the service maps it to run and application states.

## Job-side ERD

```mermaid
erDiagram
  COMPANY ||--o{ JOB_POSTING : publishes
  JOB_POSTING ||--o{ POSTING_QUESTION : asks
  ANSWER_LIBRARY o|--o{ POSTING_QUESTION : canonicalizes
  JOB_POSTING ||--o{ APPLICATION : receives
  APPLICATION ||--o{ APPLICATION_ANSWER : has
  POSTING_QUESTION o|--o{ APPLICATION_ANSWER : answers
  ANSWER_LIBRARY o|--o{ APPLICATION_ANSWER : supplies
  APPLICATION ||--o{ APPLICATION_EVENT : audits
  APPLICATION ||--o{ RUN : processes
  RUN ||--o{ RUN_EVENT : traces
  RUN ||--o{ APPROVAL : requests
  APPLICATION ||--o{ APPROVAL : owns
  APPLICATION ||--o{ INBOX_THREAD : has
  INBOX_THREAD ||--o{ INBOX_MESSAGE : contains
  APPLICATION o|--o{ EMAIL_SIGNAL : matches
  INBOX_THREAD o|--o{ EMAIL_SIGNAL : extracts
  DOCUMENT_VERSION o|--o{ APPLICATION : pins_cv
```

## Owner-side ERD

```mermaid
erDiagram
  PROFILE ||--o{ EXPERIENCE : includes
  PROFILE ||--o{ EDUCATION : includes
  DOCUMENT ||--o{ DOCUMENT_VERSION : versions
  CAP_CONVERSATION ||--o{ CAP_MESSAGE : contains
```

`site_account`, `email_signal`, and `settings` are owner records with no required parent. `site_account` holds login metadata only; passwords live in a dedicated Bitwarden account (ADR 0013). Mnemosyne owns its separate memory store; it is not part of this ERD.

## Run flow

```mermaid
sequenceDiagram
  actor Owner
  participant UI as Renderer
  participant IPC as Typed IPC
  participant App as Applications / Runs services
  participant Q as p-queue (in memory)
  participant Agent as AgentProvider
  participant Browser as BrowserProvider (Neo)
  participant DB as SQLCipher SQLite
  Owner->>UI: Add a job and start
  UI->>IPC: Validated request
  IPC->>App: Origin-check + zod-parse
  App->>DB: Create application and queued run
  App->>Q: Enqueue application
  Q->>App: Claim run
  App->>DB: queued → running
  App->>Browser: Open run tab
  App->>Agent: RunSpec + MCP config + output schema
  Agent-->>App: RunEvent stream + structured result
  App->>App: Validate result and apply transitions
  App->>DB: Persist trace, audit, answers, approval
  App-->>UI: IPC update
  Owner->>UI: Review and approve
  UI->>IPC: Approval action
  IPC->>App: Validate current form hash
  App->>DB: Record decision and submission state
```

## Data and trust boundaries

- [ADR 0016: Gentle footprint](adr/0016-gentle-footprint.md) binds every lane and review: JobPilot owns only its `userData`, explicitly exported files and run-scoped processes/tabs. It leaves installed tools and unrelated browser state untouched, adds no background presence and limits resource use and network access. The ADR records implementation gaps separately from the policy.
- SQLite uses SQLCipher, WAL, foreign keys, STRICT tables, ULID text keys, and Unix-millisecond integer timestamps. Drizzle owns table definitions and migrations. Views are maintained in `drizzle/0001_views.sql` and have typed `.existing()` handles.
- IPC, agent outputs, ATS/HTTP responses, and imported files are parsed with zod at entry. The main process is the only writer of product state.
- The renderer has no Node access. The preload exposes named operations only. IPC accepts only the trusted main frame from the app origin (or configured development origin).
- The SQLCipher key lives in Keychain via Electron `safeStorage`; builds are signed with one stable self-signed certificate so updates keep Keychain access (ADR 0014). Job-site passwords live in a dedicated Bitwarden account reached through the official Bitwarden MCP (ADR 0013). Logs and run traces are redacted.
- Every state change is auditable. Agent events are stored in `run_event` and mirrored to per-run JSONL logs.

## Package-by-feature layout

`src/main/modules/<feature>/` owns feature controllers, services, repositories, entities, and DTOs. Controllers parse and dispatch; services own rules and transactions; repositories access Drizzle; entities declare tables. `src/main/platform/` holds cross-cutting adapters and cannot import feature modules. `src/shared/` holds IPC and zod contracts shared with preload and renderer. The renderer stays a presentation layer.

## Read models

The screens query `v_application_list`, `v_up_next`, `v_inbox`, and `v_analytics_funnel`. They are read-only views defined in `drizzle/0001_views.sql` and represented by typed Drizzle handles alongside the related entities.
