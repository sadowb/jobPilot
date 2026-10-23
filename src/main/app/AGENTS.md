# app

Bootstrap only: single-instance lock, window creation, `app://` protocol, navigation lockdown, wiring controllers into `registerIpc`. No business logic or SQL here. Security settings (CSP, sandbox, fuses in `scripts/after-pack.mjs`) are changed only with an ADR 0008 update.
