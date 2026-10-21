# jobPilot

Desktop app (Electron + Vite + React + TypeScript + Tailwind v4) for JobPilot, an agent that fills job applications and lets you watch or take over. The UI matches the V17 design boards one to one, light and dark.

- Spec (read first): [docs/FRONTEND.md](docs/FRONTEND.md)
- Design source of truth: `design/v17/` (67 boards), tokens `design/tokens.json`, brand SVGs `design/brand/`

## Commands

```bash
npm ci
npm run dev          # Electron with HMR
npm run typecheck && npm run lint && npm run format:check && npm test
npm run build        # typecheck + electron-vite build -> out/
npm run start        # production build, run unpackaged (no HMR, no devtools reload)
npm run dist:dir     # packaged app, unpacked, in release/ (fast smoke test)
npm run dist         # package for this OS -> release/
npm run tokens       # regenerate styles/tokens.css from design/tokens.json
```

## Layout

```
src/main/       Electron main process (window, app:// protocol, IPC handlers)
src/preload/    contextBridge only (window.jobpilot)
src/shared/     IPC contract (channel names + types), imported by all three
src/renderer/   React UI (HashRouter; fonts bundled; CSP forbids remote hosts)
scripts/        gen-tokens, after-pack (Electron fuses)
tests/          vitest
```

## Security posture

`contextIsolation`, `sandbox`, no Node in the renderer; renderer served from `app://jobpilot/` (not `file://`); navigation and `window.open` locked, only `https:` links open in the system browser; strict CSP; single instance; fuses: RunAsNode, NODE_OPTIONS, `--inspect` and file-protocol privileges off, cookie encryption and asar integrity on.

Note: with the inspect fuse off, Playwright cannot attach to the _packaged_ app. E2E runs against the unpackaged build (`electron .`).

## Status

Foundation done (shell, theme, tokens, fonts, packaging). Screens are being ported board by board; unported routes show a placeholder naming their board.
