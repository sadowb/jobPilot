# Release and code signing

Decision record: [ADR 0014](adr/0014-stable-self-signed-code-signing.md). Today builds are ad-hoc signed (`mac.identity: null` in `electron-builder.yml`); the steps below move them to one stable self-signed certificate.

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

## 3. Wire it into builds (implementation PR)

- `electron-builder.yml`: `mac.identity: "JobPilot Self-Signed"`, keep `hardenedRuntime` off and no notarization.
- CI `app` job and `release.yml`: `CSC_LINK: ${{ secrets.MAC_CERT_P12_BASE64 }}`, `CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}`. Pull requests from forks get no secrets: fall back to ad-hoc and skip the upgrade Keychain assertion there.
- Verify after `npm run dist:dir`: `codesign -dr - release/mac-arm64/JobPilot.app` prints a DR with `certificate leaf = H"…"`, and it is identical across two builds.
- Spike to confirm in that PR: electron-builder accepts a self-signed (non-Apple) identity. If it refuses, sign in the existing `afterPack` hook with `codesign --force --deep --sign "JobPilot Self-Signed"` instead.
- Owner check, once: build twice, launch both on the same userData, and confirm there is no Keychain prompt on the second launch.

## 4. Releasing

Tag `vX.Y.Z` matching `package.json`; `release.yml` runs all tiers (ADR 0012), builds the arm64 dmg, writes `SHA256SUMS`, and creates a **draft** GitHub Release. The owner reviews and publishes. First open of a downloaded build: System Settings > Privacy & Security > Open Anyway (no notarization).
