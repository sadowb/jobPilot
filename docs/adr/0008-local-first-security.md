# ADR 0008: Local-first security model

- Status: accepted
- Decision: Treat the OS user account and full-disk encryption (FileVault, BitLocker, LUKS) as the outer boundary; use no login or network listeners. Enforce renderer sandboxing, CSP, sender-frame/origin checks, zod IPC validation, SQLCipher, safeStorage (OS keystore), scoped agent credentials, and log redaction.
- Rationale: The product is for one owner on a local machine and stores application and account data.
- Consequence: Security-sensitive changes stay in the main process and native dependencies require runtime verification.
- Packaged Playwright tests need Electron's Node inspector to evaluate main-process state. `scripts/run-e2e.mjs` enables the inspector fuse only while those tests run and restores it before the build artifact is created; released packaged apps keep the inspector disabled.
