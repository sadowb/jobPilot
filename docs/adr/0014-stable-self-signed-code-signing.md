# ADR 0014: Sign every build with one stable self-signed certificate

- Status: accepted (2026-10-23), implementation planned (see [docs/RELEASE.md](../RELEASE.md)).
- Decision: Replace ad-hoc signing (`mac.identity: null`) with one long-lived self-signed **code-signing** certificate, used for local `dist` builds, CI packaged tests and releases. Revisit Apple Developer ID (99 USD/year) only if Gatekeeper friction on download becomes a problem.

## Problem

macOS Keychain items carry an access list keyed by the app's **designated requirement** (DR). Electron `safeStorage` stores the SQLCipher key in the item `JobPilot Safe Storage`.

- Ad-hoc signature: DR is the code hash (`cdhash`), so every build is a different app to Keychain. After each update the owner gets "JobPilot wants to use your confidential information…"; clicking Deny leaves the database unopenable.
- Stable certificate: DR is `identifier "app.jobpilot.desktop" and certificate leaf = H"<cert sha1>"`, identical across builds. "Always Allow" survives updates.

## What it does and does not fix

|                                                | Ad-hoc (today)                                       | Self-signed (this ADR) | Developer ID + notarization |
| ---------------------------------------------- | ---------------------------------------------------- | ---------------------- | --------------------------- |
| Keychain prompt after update                   | every update                                         | never (same cert)      | never                       |
| Gatekeeper on first open of a downloaded build | blocked; Settings > Privacy & Security > Open Anyway | same                   | clean                       |
| Cost                                           | free                                                 | free                   | 99 USD/year                 |

## Rules

- The private key (`.p12`) is a release secret: kept in the owner's **main** Bitwarden vault and as GitHub Actions secrets `MAC_CERT_P12_BASE64` + `MAC_CERT_PASSWORD`. Never in the repo; gitleaks runs on every commit.
- Validity 10 years. Rotating the certificate changes the DR once, so plan a single Keychain prompt and release note when it happens.
- CI imports the certificate into a temporary keychain per job (electron-builder `CSC_LINK` / `CSC_KEY_PASSWORD`) and deletes it after.
- The ADR 0012 upgrade journey (base build then PR build on the same userData) is the regression test: it fails if the second launch cannot read the Keychain item without a prompt.
