# platform/secrets

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

OS keystore access through Electron `safeStorage` (macOS Keychain, Windows DPAPI, Linux libsecret or KWallet); DB key creation and retrieval; Touch ID prompt on macOS (`systemPreferences.promptTouchID`). The only place that handles raw secrets.
