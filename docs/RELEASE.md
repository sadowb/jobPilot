# Downloading and verifying JobPilot

Builds are published on the [Releases page](https://github.com/sadowb/jobPilot/releases).

| Platform              | File                           |
| --------------------- | ------------------------------ |
| macOS (Apple silicon) | `JobPilot-X.Y.Z-arm64.dmg`     |
| Windows (x64)         | `JobPilot-X.Y.Z-x64-setup.exe` |

Every release is marked **pre-release** while the app is unfinished. Expect missing features and rough edges; your data stays in a local, encrypted database either way.

## First open

JobPilot is not notarized by Apple and the Windows installer is unsigned, so each OS asks you to confirm once.

- **macOS:** open the DMG, drag JobPilot to Applications and open it. macOS blocks it the first time. Go to System Settings → Privacy & Security and choose **Open Anyway**.
- **Windows:** SmartScreen shows "Windows protected your PC". Choose **More info**, then **Run anyway**.

## Verify a download

Each release is built by GitHub Actions in this repository and carries a signed build-provenance attestation. With the [GitHub CLI](https://cli.github.com/):

```bash
gh attestation verify JobPilot-X.Y.Z-arm64.dmg -R sadowb/jobPilot
```

`SHA256SUMS` lists the checksum of every file, and `jobpilot.spdx.json` is the SPDX dependency SBOM. Check a checksum with `shasum -a 256 -c SHA256SUMS --ignore-missing` (macOS) or `Get-FileHash <file>` (Windows). The release page itself is immutable: assets and tag cannot change after publishing.

## How releases are made

Commits to `main` follow Conventional Commits. [release-please](https://github.com/googleapis/release-please) keeps one "Release vX.Y.Z" pull request open with the version bump and changelog. When a maintainer merges it, the same workflow ([`release.yml`](../.github/workflows/release.yml)) runs all checks and end-to-end journeys, builds and signs the macOS app with the project's code-signing identity ([ADR 0014](adr/0014-stable-self-signed-code-signing.md)), builds the Windows installer, attests every file and publishes the release.
