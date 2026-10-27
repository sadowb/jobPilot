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
- GitHub: store both `MAC_CERT_*` values as **release environment secrets**, not repository secrets: `base64 -i jp.p12 | gh secret set MAC_CERT_P12_BASE64 --env release -R sadowb/jobPilot`, then `gh secret set MAC_CERT_PASSWORD --env release -R sadowb/jobPilot` (paste the password at the prompt).
- `rm -rf ~/jp-cert`

## 3. Wire it into builds

- The macOS `app` job generates a fresh self-signed certificate with `extendedKeyUsage=codeSigning`, imports it into a `$RUNNER_TEMP` keychain, makes that keychain the only search and default keychain for the job, and adds a code-signing-only trust record for the certificate. It sets a non-interactive codesign partition list, signs the packaged PR app and PR-base app with that identity after electron-builder, verifies their designated requirements match and use a certificate leaf hash, then deletes the keychain and key material even on failure; trust records disappear with the ephemeral runner. macOS needs the trust entry for `security find-identity` to recognize it as a valid signing identity. Fork PRs need no repository secrets.
- `scripts/run-e2e.mjs` keeps the signed identity while toggling the inspector fuse and re-signs both apps after each toggle. Local runs without `JOBPILOT_SIGN_IDENTITY` keep ad-hoc signing.
- `release.yml` runs the `package-mac` job in the `release` environment (deployment branch policy: `main`; see section 5). It requires `MAC_CERT_P12_BASE64` and `MAC_CERT_PASSWORD` and fails before packaging with a pointer to this document if either is absent. It imports that real release certificate into a temporary keychain, signs with it, uses the same identity during the upgrade journey, and deletes the keychain even on failure. Releases never use the CI throwaway identity. `CSC_FOR_PULL_REQUEST` is set only for the PR packaging job. The Windows job has no environment and no secrets.
- Verify after CI packaging: `codesign -dr - release/mac-arm64/JobPilot.app` prints a DR with `certificate leaf = H"…"`, and it is identical for the PR and base builds. `scripts/verify-shipped.mjs` checks the final app with `codesign --verify --deep --strict`.

## 4. Releasing

Owner actions: merge conventional-commit PRs as usual, then merge the **"chore(main): release X.Y.Z"** PR that [release-please](https://github.com/googleapis/release-please-action) keeps open. That is the only ship decision. Everything after is `release.yml`, one workflow on `push: main` (tags created with `GITHUB_TOKEN` cannot trigger another workflow, and there is no PAT or GitHub App):

1. `release-please` job: updates the release PR; when the release PR was just merged it creates a **draft** GitHub Release plus the `vX.Y.Z` tag (`draft` + `force-tag-creation` in `release-please-config.json`, otherwise GitHub creates no tag for a draft) and outputs `release_created`, `tag_name`, `sha`. All later jobs run only when `release_created == 'true'` and check out that `sha`.
2. `static`: all static gates (ADR 0012) and a check that the tag version equals `package.json`.
3. `package-mac` (`macos-14`, `release` environment, `contents: read`): sign with the stable identity, packaged + upgrade journeys, verify shipped bytes, arm64 DMG, SPDX SBOM (`jobpilot.spdx.json`). Uploaded as a workflow artifact.
4. `package-win` (`windows-latest`, `contents: read`, no secrets): unsigned NSIS x64 installer `JobPilot-X.Y.Z-x64-setup.exe`. Windows is built here without the journeys (Windows CI lives in `ci.yml`).
5. `publish` (`contents: write`, `id-token: write`, `attestations: write`; the only job with any of them besides `release-please`): writes `SHA256SUMS` over DMG, installer and SBOM, runs `actions/attest-build-provenance` on all four files, uploads them to the still-draft release, then publishes it (`gh release edit --draft=false`). Draft-first is required: immutable releases reject asset changes after publishing.

`prerelease: true` and `bump-minor-pre-major: true` keep every 0.x release marked **pre-release** with breaking changes bumping the minor. `release-please-config.json` pins `"release-as": "0.1.0"` and the manifest starts at `0.0.0` so the first release is v0.1.0. **After v0.1.0 ships, delete the `release-as` line** or every later release PR stays at 0.1.0.

Verify a download:

```bash
gh attestation verify JobPilot-X.Y.Z-arm64.dmg -R sadowb/jobPilot
```

If a job fails after the draft exists, fix forward and use "Re-run failed jobs" on the same run (same `sha`). The draft and tag may be deleted freely while the release is unpublished; after publishing the tag name can never be reused (immutable releases), so bump to the next patch instead.

Known limits: the release PR is created with `GITHUB_TOKEN`, so CI does not run on it; if `main: CI must pass` blocks the merge, the owner merges it as a ruleset bypass actor (the PR only touches `package.json`, `CHANGELOG.md` and the manifest). No notarization, so first open needs the Gatekeeper/SmartScreen steps in the README.

## 5. One-time repository settings (owner)

Run once, as repo admin. An agent does not run these.

```bash
# Immutable releases: published assets and tag can no longer change; GitHub adds a release attestation.
gh api -X PUT repos/sadowb/jobPilot/immutable-releases

# Block update and deletion of v* tags.
gh api -X POST repos/sadowb/jobPilot/rulesets --input - <<'JSON'
{
  "name": "v* tags are immutable",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [{ "type": "update" }, { "type": "deletion" }]
}
JSON

# The release job now runs from main, not from a v* tag: swap the environment's deployment policy.
gh api -X POST repos/sadowb/jobPilot/environments/release/deployment-branch-policies -f name=main -f type=branch
gh api -X DELETE repos/sadowb/jobPilot/environments/release/deployment-branch-policies/64048109
```

`64048109` is the current `v*` tag policy id; confirm with `gh api repos/sadowb/jobPilot/environments/release/deployment-branch-policies`. Also needed: Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests" (release-please opens the release PR). Tag _creation_ is not restricted: the workflow creates tags with `GITHUB_TOKEN`, which cannot be a ruleset bypass actor without a GitHub App.
