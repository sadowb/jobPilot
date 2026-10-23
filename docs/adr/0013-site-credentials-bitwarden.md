# ADR 0013: Job-site credentials live in a dedicated Bitwarden account

- Status: accepted (2026-10-23). Supersedes the `site_account.secret_enc` part of ADR 0008.
- Decision: Passwords (and TOTP seeds) for job sites are stored in a **separate Bitwarden account used only for JobPilot**, never in the JobPilot database. Agent runs get the official Bitwarden MCP server (`@bitwarden/mcp-server`, stdio, pinned version) as an additive MCP, like Neo and Mnemosyne.

## Why

- **No custom secret store.** `secret_enc` meant our own encryption, reveal UI, Touch ID gate and rotation code. Bitwarden already does storage, sync across devices, password generation, TOTP and audit, and is open source.
- **Separate account, not the owner's main vault.** Agents read untrusted job pages; a prompt injection could make an agent call vault tools. The official MCP exposes the whole vault of the unlocked account (read, create, edit, delete). A dedicated account limits the blast radius to job-site logins. It does not restrict what the agent can do on job sites.
- **Agents can create accounts end to end.** On sign-up pages (Workday, iCIMS, Taleo) the agent generates a password with the MCP and saves the item in the same step; re-login later finds it by host.

## How it works

1. **Setup (owner, once):** create the Bitwarden account (own strong master password kept in the owner's main vault, 2FA on). JobPilot installs pinned `@bitwarden/cli` and `@bitwarden/mcp-server` into `userData/tools` on first use (runs on Electron's bundled Node via `ELECTRON_RUN_AS_NODE`; no system Node).
2. **Unlock per app session:** a JobPilot "Unlock job vault" dialog sends the master password over typed IPC to main, which runs `bw unlock --raw --passwordenv` through execa with the password only in the child's env. Main keeps the returned `BW_SESSION` **in memory only**, passes it as env to each run's Bitwarden MCP process, and runs `bw lock` on quit or after the idle timeout. The master password is never stored, logged or sent to an agent.
3. **Run time:** the agent looks up the item by host, logs in, and on a changed password updates the item. Login failure sets `site_account.status = 'needs_relogin'`, records an `application_event` (AuditService) and raises an Inbox item.
4. **`site_account` becomes metadata:** `host`, `username`, `bitwarden_item_id`, `status`, `last_login_at`. Migration (drop `secret_enc`, add `bitwarden_item_id`) lands in the Phase 6 accounts PR, before any real secret is stored.

## Consequences and risks

- **The agent sees the plaintext password** (that is how the MCP returns it), so it reaches the model provider. Accepted by the owner. RunTraceService must redact Bitwarden tool results (`password`, `totp`, `notes`, custom hidden fields) before writing `run_event` or JSONL; the E2E redaction assertion (ADR 0012) covers it.
- **Licence:** the MCP server is GPL-3.0. It is installed at runtime as a separate process, not bundled into the `.app`, so JobPilot is not a derivative work. Do not vendor it into the build.
- **TOTP generation** needs Bitwarden Premium on the dedicated account; without it, email codes stay on the agent's Gmail connector (Phase 6).
- **Vault locked** means runs that need a login pause with `blocked` + reason `vault_locked` instead of failing.
- **Not chosen:** the owner's main vault (blast radius); Bitwarden Agent Access / `aac` (early preview, no MCP, CLI pairing; revisit when stable); our own `safeStorage` store (custom crypto code, no sync).
- The SQLCipher database key stays in Keychain via `safeStorage` (ADR 0001); it must be readable at boot before any vault is unlocked. Its prompt-on-update problem is ADR 0014.
