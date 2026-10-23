# ADR 0008: Local-first security model

- Status: accepted
- Decision: Treat the macOS account and FileVault as the outer boundary; use no login or network listeners. Enforce renderer sandboxing, CSP, sender-frame/origin checks, zod IPC validation, SQLCipher, Keychain / safeStorage, scoped agent credentials, and log redaction.
- Rationale: The product is for one owner on a local machine and stores application and account data.
- Consequence: Security-sensitive changes stay in the main process and native dependencies require runtime verification.
