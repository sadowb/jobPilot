# Release and code signing

Decision record: [ADR 0014](adr/0014-stable-self-signed-code-signing.md). Local builds without a configured identity remain ad-hoc. Pull request CI creates one throwaway identity per macOS job and signs both the PR and base apps with it; releases use the long-lived certificate described below.

## 1. Create the certificate (owner, once, on your Mac)

These commands change your login Keychain and handle a private key, so the owner runs them, not an agent. Work in a temporary folder and delete it at the end.

```bash
mkdir -m 700 ~/jp-cert && cd ~/jp-cert
openssl req -x509 -newkey rsa:3072 -sha256 -days 3650 -nodes \
  -keyout jp.key -out jp.crt -subj "/CN=JobPilot Self-Signed" \
  -addext "basicConstraints=critical,CA:false" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=critical,codeSigning"
openssl pkcs12 -export -inkey jp.key -in jp.crt -name "JobPilot Self-Signed" -out jp.p12
security import jp.p12 -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign
security add-trusted-cert -p codeSign -k ~/Library/Keychains/login.keychain-db jp.crt
security find-identity -v -p codesigning   # must list "JobPilot Self-Signed"
```

`openssl pkcs12 -export` asks for an export password: generate a strong one in Bitwarden. If `security import` rejects the file (OpenSSL 3 defaults), re-export with `-legacy`. `add-trusted-cert` asks for your macOS password.

## 2. Store the secret, then delete the files

- Main Bitwarden vault: item "JobPilot code-signing cert" with `jp.p12` attached and the export password.
- GitHub: `base64 -i jp.p12 | gh secret set MAC_CERT_P12_BASE64 -R sadowb/jobPilot`, then `gh secret set MAC_CERT_PASSWORD -R sadowb/jobPilot` (paste the password at the prompt).
- `rm -rf ~/jp-cert`

## 3. Wire it into builds

- The macOS `app` job generates a fresh self-signed certificate with `extendedKeyUsage=codeSigning`, imports it into a `$RUNNER_TEMP` keychain, and adds a code-signing-only trust record for the certificate. It sets a non-interactive codesign partition list, signs the packaged PR app and PR-base app with that identity after electron-builder, verifies their designated requirements match and use a certificate leaf hash, then removes the trust record, keychain and key material even on failure. macOS needs the trust entry for `security find-identity` to recognize it as a valid signing identity. Fork PRs need no repository secrets.
- `scripts/run-e2e.mjs` keeps the signed identity while toggling the inspector fuse and re-signs both apps after each toggle. Local runs without `JOBPILOT_SIGN_IDENTITY` keep ad-hoc signing.
- `release.yml` requires `MAC_CERT_P12_BASE64` and `MAC_CERT_PASSWORD` and fails before packaging with a pointer to this document if either is absent. It imports that real release certificate into a temporary keychain, passes the secrets to electron-builder, and uses the same identity during the upgrade journey. Releases never use the CI throwaway identity. `CSC_FOR_PULL_REQUEST` is set only for the PR packaging job.
- Verify after CI packaging: `codesign -dr - release/mac-arm64/JobPilot.app` prints a DR with `certificate leaf = H"…"`, and it is identical for the PR and base builds. `scripts/verify-shipped.mjs` checks the final app with `codesign --verify --deep --strict`.

## 4. Releasing

Tag `vX.Y.Z` matching `package.json`; `release.yml` runs all tiers (ADR 0012), builds the arm64 dmg, writes `SHA256SUMS`, and creates a **draft** GitHub Release. The owner reviews and publishes. First open of a downloaded build: System Settings > Privacy & Security > Open Anyway (no notarization).
