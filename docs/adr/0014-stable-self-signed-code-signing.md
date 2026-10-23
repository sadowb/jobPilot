# ADR 0014: Use a stable signing identity where builds share Keychain data

- Status: accepted (2026-10-23), implemented.
- Decision: Use a long-lived self-signed **code-signing** certificate for releases. Each macOS CI packaging job creates a fresh throwaway code-signing identity and uses it for both PR and base apps in the upgrade journey. Local builds without a configured identity remain ad-hoc. Revisit Apple Developer ID (99 USD/year) only if Gatekeeper friction on download becomes a problem.

## Problem

macOS Keychain items carry an access list keyed by the app's **designated requirement** (DR). Electron `safeStorage` stores the SQLCipher key in the item `JobPilot Safe Storage`.

- Ad-hoc signature: DR is the code hash (`cdhash`), so every build is a different app to Keychain. After each update the owner gets "JobPilot wants to use your confidential information…"; clicking Deny leaves the database unopenable.
- Shared certificate: DR is `identifier "app.jobpilot.desktop" and certificate leaf = H"<cert sha1>"`, identical for builds signed with that certificate. "Always Allow" survives updates.

## What it does and does not fix

|                                                | Ad-hoc (today)                                       | Self-signed (this ADR) | Developer ID + notarization |
| ---------------------------------------------- | ---------------------------------------------------- | ---------------------- | --------------------------- |
| Keychain prompt after update                   | every update                                         | never (same cert)      | never                       |
| Gatekeeper on first open of a downloaded build | blocked; Settings > Privacy & Security > Open Anyway | same                   | clean                       |
| Cost                                           | free                                                 | free                   | 99 USD/year                 |

## Rules

- The private key (`.p12`) is a release secret: kept in the owner's **main** Bitwarden vault and as GitHub Actions secrets `MAC_CERT_P12_BASE64` + `MAC_CERT_PASSWORD`. Never in the repo; gitleaks runs on every commit.
- Validity 10 years. Rotating the certificate changes the DR once, so plan a single Keychain prompt and release note when it happens.
- Pull request CI generates a new self-signed code-signing certificate per macOS job, imports it into a temporary keychain, adds a code-signing-only trust record for that certificate, and removes the trust record, keychain and key material at job end. macOS requires that trust entry for `security find-identity` to recognize the certificate as a valid signing identity. CI signs the PR and base `.app` after electron-builder, then checks both designated requirements match and contain a certificate leaf hash. No signing secret is used.
- Release CI requires `MAC_CERT_P12_BASE64` and `MAC_CERT_PASSWORD`, imports that real release identity into a temporary keychain, and uses it for the tested `.app` and DMG. See [docs/RELEASE.md](../RELEASE.md).
- The ADR 0012 upgrade journey (base build then PR build on the same userData) is the regression test: ad-hoc apps with changed bytes have different cdhash requirements and can prompt. CI's shared per-job identity makes the journey's requirements match even when PR and base shipped bytes differ.
