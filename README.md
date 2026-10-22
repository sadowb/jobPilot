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

## Desktop appearance

Click the sun/moon icon in the top bar (also available during setup) to switch directly
between Light and Dark with a brief fade. Reduced motion skips the animation.
Choose System in Settings to follow your device. The preference
stays in sync across the app and survives restarts. On macOS, the
native window buttons align with a compact 56px toolbar that stays visible when scrolling.
Sheets open below it; the redundant logo is hidden and empty header space drags the window. See [the desktop UI review](docs/UI_REVIEW.md) for page coverage and remaining prototype behavior.

## Profile & documents

Click the account initials in the top bar to open About me (`#/profile`). Edit contact details,
links, education, job preferences, and reusable application answers. Use a section’s Edit action to open its side sheet, then Save changes;
Cancel or Escape restores the last saved values. Common answers can be edited, added, searched, or removed.
Saved details and answers persist locally. Documents (`#/profile?section=documents`) supports PDF/DOCX
uploads up to 20 MB, local storage, downloading a copy through the native Save dialog, and removal.
CV parsing and agent/backend sync are not connected. The V17 Profile board supplied the visual language
and Documents layout; About me completes the sidebar section that had no dedicated board.

## Security posture

`contextIsolation`, `sandbox`, no Node in the renderer; renderer served from `app://jobpilot/` (not `file://`); navigation and `window.open` locked, only `https:` links open in the system browser; strict CSP; single instance; fuses: RunAsNode, NODE_OPTIONS, `--inspect` and file-protocol privileges off, cookie encryption and asar integrity on.

Note: with the inspect fuse off, Playwright cannot attach to the _packaged_ app. E2E runs against the unpackaged build (`electron .`).

## Status

Foundation done (shell, theme, tokens, fonts, packaging). Screens are being ported board by board; unported routes show a placeholder naming their board.

## Visual regression

Real-Electron screenshot comparison, used to verify the CSS to Tailwind migration with pixel parity.

```bash
# 1. build each tree you want to compare
(cd <worktree> && npx electron-vite build)
# 2. capture every screen, light and dark (fresh user-data dir, fixed 1440x900 window)
npm run visual:capture -- --app <worktree> --out /tmp/vis/head [--only <substring>]
# 3. compare against a baseline capture; exit code 1 if any screen FAILs
npm run visual:diff -- --base /tmp/vis/base --head /tmp/vis/head --out /tmp/vis/report [--threshold 0.001]
```

- `scripts/visual/screens.mjs` declares screens and overlay actions; `scripts/visual/fixture.json` is the fake
  localStorage seed (reapplied before every page load, so each screen starts from identical state).
- Determinism: fresh `--user-data-dir` per launch, theme through the `theme-preference` file the main process reads,
  `reducedMotion: reduce`, frozen `Date` (`page.clock.setFixedTime`), `document.fonts.ready` + network idle + two
  animation frames before each shot, caret hidden through a constructed stylesheet (the CSP forbids inline `<style>`).
- Report: `report.md` (FAIL first, by changed %), `report.html` (base | head | diff for FAIL rows). FAIL means more than
  0.1% of pixels changed, a size mismatch, a missing file or a capture error.
- Limits: screenshots are taken at the machine's device scale factor, so compare captures from the same machine;
  `Date` is frozen but timers still run; a screen whose selector fails is recorded as ERROR and fails the diff.
