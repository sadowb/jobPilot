# Development

JobPilot is a cross-platform Electron app. Develop on macOS, Windows or Linux with Node 22.12+.

```bash
npm ci
npm run dev          # Electron with hot reload
```

## Commands

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
npm run build        # typecheck + electron-vite build -> out/
npm run start        # production build, unpackaged
npm run dist:dir     # packaged app, unpacked, in release/ (quick smoke test)
npm run dist         # package for this OS -> release/
npm run e2e          # Playwright journeys against the built app
npm run tokens       # regenerate styles/tokens.css from design/tokens.json
npm run db:generate  # migration after an entity change (then npm run db:check)
```

## Layout

```
src/main/app/        bootstrap, windows, security, app:// protocol
src/main/modules/    one folder per feature: controller -> service -> repository -> entity
src/main/platform/   db, queue, agents, browsers, secrets, ipc
src/preload/         contextBridge only
src/shared/          IPC channels + zod DTOs shared by main and renderer
src/renderer/        React UI
e2e/                 Playwright journeys against the built app
design/v17/          design boards (source of truth for the UI)
```

Rules for contributors and agents: [AGENTS.md](../AGENTS.md). Architecture: [architecture.md](architecture.md) and [adr/](adr/). How work flows from issue to merged PR: [FACTORY.md](FACTORY.md).

## Security posture

- Renderer: `contextIsolation`, `sandbox`, no Node, served from `app://jobpilot/` (not `file://`), strict CSP, navigation and `window.open` locked, only `https:` links open in the system browser, single instance.
- Electron fuses: RunAsNode, `NODE_OPTIONS`, `--inspect` and file-protocol privileges off; cookie encryption and asar integrity on. With the inspect fuse off, Playwright cannot attach to the packaged app, so dev journeys run against `electron .`.
- Data: SQLCipher database with its key in the OS keystore (macOS Keychain, Windows DPAPI, Linux libsecret or KWallet) via Electron `safeStorage`. Every IPC payload, agent output and HTTP response is validated with zod. Outbound fetches are SSRF-checked (https only, DNS-pinned, private ranges blocked).
- CI: gitleaks, zizmor, `npm audit`, CodeQL and secret-scanning push protection.

## Visual regression

Real-Electron screenshot comparison of every screen, light and dark.

```bash
# 1. build each tree you want to compare
(cd <worktree> && npx electron-vite build)
# 2. capture every screen, light and dark (fresh user-data dir, fixed 1440x900 window)
npm run visual:capture -- --app <worktree> --out /tmp/vis/head [--only <substring>]
# 3. compare against a baseline capture; exit code 1 if any screen FAILs
npm run visual:diff -- --base /tmp/vis/base --head /tmp/vis/head --out /tmp/vis/report [--threshold 0.001]
```

- `scripts/visual/screens.mjs` declares screens and overlay actions; `scripts/visual/fixture.json` is the fake localStorage seed, reapplied before every page load.
- Determinism: fresh `--user-data-dir` per launch, theme through the `theme-preference` file, `reducedMotion: reduce`, frozen `Date`, fonts + network idle + two animation frames before each shot, caret hidden.
- Report: `report.md` (FAIL first) and `report.html` (base | head | diff). FAIL means more than 0.1% of pixels changed, a size mismatch, a missing file or a capture error.
- Limits: compare captures from the same machine (device scale factor); timers still run; a screen whose selector fails is recorded as ERROR.

## README images

The banner and framed screenshots in `docs/screenshots/` are generated from a visual capture:

```bash
npx electron-vite build
npm run visual:capture -- --app . --out /tmp/vis
node scripts/readme/render.mjs --shots /tmp/vis
```

Crops and the banner copy live in `scripts/readme/render.mjs`. It uses Playwright's Chromium, or the installed Chrome when that is missing.
