# platform/secrets

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

Keychain access through Electron `safeStorage`; DB key creation and retrieval; Touch ID prompt (`systemPreferences.promptTouchID`). The only place that handles raw secrets.
