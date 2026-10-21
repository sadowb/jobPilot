# JobPilot frontend: design source of truth (V17)

Everything here is extracted **verbatim** from the Claude Design canvas _JobPilot Dashboard Redesign_, page **"V 17 · Full flow"** (https://claude.ai/artifact/94Mti6VB8NuNJ49dqXbLSw). Nothing is paraphrased or "matched to similar": if a value is not in this file it is not in V17.

| What                                                                | Where in this repo                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| All 67 V17 artboards (HTML, 1 file each; `_L` light, `_D` dark)     | [`design/v17/boards/`](../design/v17/boards)          |
| The stylesheet every artboard links (`jp8.css`, cascade v13 to v17) | [`design/v17/jp8.css`](../design/v17/jp8.css)         |
| Canvas index (board sizes, titles, page list)                       | [`design/v17/canvas.json`](../design/v17/canvas.json) |
| Resolved tokens, machine readable                                   | [`design/tokens.json`](../design/tokens.json)         |
| Logo mark, Cap + dart mascot (SVG)                                  | [`design/brand/`](../design/brand)                    |

**"One to one" rule.** A screen is done only when it matches its board at the board's size, in light and dark. The boards are the spec; this document indexes them. When the doc and a board disagree, the board wins and the doc is fixed.

---

## 1. Brand

- **Product name:** JobPilot. Wordmark is lower-case **`jobpilot`**, set in **Bagel Fat One 400, 23px, letter-spacing -0.01em**, 8px gap after the mark (`.logo` in `jp8.css`).
- **Mark:** a paper dart (24×24 viewBox) in `currentColor`, with a small "window" dot. Rendered 28×28. Source: [`design/brand/logo-mark.svg`](../design/brand/logo-mark.svg). Colour = `--ink` (black in light, `#F5F5F5` in dark); the cut-out strokes use the surface colour (`--bg`).
- **Mascot: Cap.** A round blue critter with a brown cap (gold button), riding the dart. Used for empty states, onboarding, the Inbox "pilot" thread and motion. Source: [`design/brand/cap-and-dart.svg`](../design/brand/cap-and-dart.svg). Cap colours are **fixed, not themed**: outline `#1A1A1A`, body `#8EC5FF`, cheeks `#FF6F8E` (50% opacity), cap/hair `#8A5A3B`, button `#F5C64E`, eye highlight `#FFFFFF`. The dart body uses `--ink`; the highlight stroke uses `--panel`.
- **Voice:** first person, Cap speaks ("Hi, I'm Cap. I'll fill job applications for you."). Headlines are an upright serif phrase plus an _italic serif_ tail (`<span class="it">`).
- **Shape language:** pills (`border-radius:99px`) for nav, chips, filters; 12px controls; 20 to 24px cards; hairline borders instead of heavy shadows.
- **Primary action is black/near-black** (`--pri`). Emerald (`--brand`) is for state and identity only.

## 2. Colour tokens

V17 uses exactly two themes: **light** (`:root`) and **dark** (`.dark` on the root `.app`). The `warm` and `dim` dark variants in `jp8.css` are older (v13) and **not used by any V17 board**; do not ship them.

| Token          | Light                                                       | Dark                                                | Role                                                 |
| -------------- | ----------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `--ground`     | `#F8F8F8`                                                   | `#141414`                                           | App ground (behind cards)                            |
| `--bg`         | `#FFFFFF`                                                   | `#1C1C1C`                                           | Card / surface                                       |
| `--panel`      | `#F3F3F3`                                                   | `#242424`                                           | Recessed panel, table header, segmented track        |
| `--hover`      | `#EBEBEB`                                                   | `#2C2C2C`                                           | Hover fill                                           |
| `--line`       | `#E6E6E6`                                                   | `#303030`                                           | Hairline border                                      |
| `--line-2`     | `#8F8F8F`                                                   | `#5C5C5C`                                           | Strong border (inputs, unchecked controls)           |
| `--ink`        | `#111111`                                                   | `#F5F5F5`                                           | Primary text                                         |
| `--ink-2`      | `#2B2B2B`                                                   | `#DEDEDE`                                           | Secondary text                                       |
| `--muted`      | `#5F5F5F`                                                   | `#B3B3B3`                                           | Tertiary text, labels                                |
| `--pri`        | `#111111`                                                   | `#F5F5F5`                                           | Primary action (pill/button/active nav)              |
| `--on-pri`     | `#FFFFFF`                                                   | `#111111`                                           | Text on --pri                                        |
| `--pri-h`      | `#2B2B2B`                                                   | `#FFFFFF`                                           | --pri hover                                          |
| `--brand`      | `#00846A`                                                   | `#4BD6A8`                                           | Emerald: state + identity (never the primary button) |
| `--brand-h`    | `#006E58`                                                   | `#62E2B8`                                           | --brand hover                                        |
| `--brand-tint` | `#DCEFE8`                                                   | `#173A2F`                                           | Brand wash                                           |
| `--on-brand`   | `#FFFFFF`                                                   | `#00140E`                                           | Text on --brand                                      |
| `--brand-text` | `#006652`                                                   | `#7BE3C0`                                           | Brand-coloured text                                  |
| `--work`       | `#00735C`                                                   | `#4BD6A8`                                           | 'Working' state text                                 |
| `--work-tint`  | `#DCEFE8`                                                   | `#173A2F`                                           | 'Working' state fill                                 |
| `--need`       | `#6B4D00`                                                   | `#F5CF5A`                                           | 'Needs you' text                                     |
| `--need-tint`  | `#F7E7AE`                                                   | `#3A3010`                                           | 'Needs you' fill (also hero/callout)                 |
| `--need-line`  | `#E3C764`                                                   | `#5C4A10`                                           | 'Needs you' border                                   |
| `--need-dot`   | `#E2AE12`                                                   | `#EDBE2E`                                           | 'Needs you' dot, badge fill                          |
| `--bad`        | `#B42F1C`                                                   | `#FF8A75`                                           | Error / destructive                                  |
| `--bad-tint`   | `#F8E1DC`                                                   | `#3D1A14`                                           | Error fill                                           |
| `--ok`         | `#000000`                                                   | `#EDEDED`                                           | Done-state text                                      |
| `--sage`       | `#BDBDBD`                                                   | `#3A3A3A`                                           | Neutral mid-grey (disabled bars)                     |
| `--grid`       | `transparent`                                               | `transparent`                                       | Background grid (transparent in V17)                 |
| `--float`      | `0 1px 2px rgb(0 0 0/.06),0 24px 48px -18px rgb(0 0 0/.25)` | `0 0 0 1px #303030,0 24px 48px -12px rgb(0 0 0/.6)` | Elevation shadow for menus/popovers                  |

Shadow `--float`: light `0 1px 2px rgb(0 0 0/.06),0 24px 48px -18px rgb(0 0 0/.25)`; dark `0 0 0 1px #303030,0 24px 48px -12px rgb(0 0 0/.6)`.

**Colour rules (from the boards):**

- Status chips: working = `--work-tint`/`--work` with `●`; needs-you = `--need-tint`/`--need` with `◆`; done = `--hover`/`--ink` with `✓`; idle = `--panel`/`--muted` with `○`; failed = `--bad-tint`/`--bad` with `▲`. State is never colour-only: the glyph is part of the chip.
- Badges (count on nav): `--need-dot` fill, text `#1A1300`, 12px / 700.
- Selection: table row `--panel` with a 3px inset `--ink` bar at the left; selected option/radio = `--ink` border + `--panel` fill.
- Focus ring: `outline:3px solid var(--ink); outline-offset:2px`.
- Scrim: light `rgb(0 0 0/.25)`, dark `rgb(0 0 0/.45)`, 8px backdrop blur.
- Agent avatars (letter tiles, `g1..g8`): background / text.

| Avatar | Light                 | Dark                  |
| ------ | --------------------- | --------------------- |
| g1     | `#E3E9DC` / `#3E5234` | `#34402D` / `#C9DBBB` |
| g2     | `#DFEBEE` / `#2C5F6E` | `#22393F` / `#A9D4E0` |
| g3     | `#F3E4D3` / `#80491A` | `#44331F` / `#EDC398` |
| g4     | `#EEDFE0` / `#7D3D45` | `#43292D` / `#E8B5BC` |
| g5     | `#E6E2EE` / `#544774` | `#332D45` / `#CBC0E6` |
| g6     | `#E8E5D6` / `#5E5730` | `#3B3822` / `#DCD3A0` |
| g7     | `#E1E6EA` / `#3F5160` | `#2B353D` / `#BCCBD6` |
| g8     | `#EDE2D8` / `#6E4A35` | `#40302A` / `#E2C1AA` |

## 3. Typography

All fonts are **bundled locally** in the app (it must work offline; no Google Fonts at runtime). The boards load them from Google Fonts, so the families and axes below are what to package:

| Role                               | Family            | Axes used                                                                                                   |
| ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| UI text (`--sans`)                 | **Geist**         | wght 400, 500, 600, 700 (also 550/650 appear in `font-weight`: map to the variable axis, Geist is variable) |
| Labels / numerals / kbd (`--mono`) | **Geist Mono**    | wght 400, 500                                                                                               |
| Headings + metrics (`--serif`)     | **Newsreader**    | opsz 6..72, wght 300..600, roman + italic (italic wght 300..500)                                            |
| Wordmark only                      | **Bagel Fat One** | 400                                                                                                         |

`Chewy` is requested by the boards' `<link>` but no rule uses it. Do not bundle it.

Fallback stacks (verbatim): `'Geist',-apple-system,system-ui,sans-serif` · `'Newsreader',ui-serif,Georgia,serif` · `'Geist Mono',ui-monospace,Menlo,monospace`.

**Type roles:**

| Role                                | Spec                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Page title `.h1`                    | Newsreader 350, 46px default (boards override: 42px dashboard, 64px welcome), -0.025em, line-height 1.02 |
| Section title `.h2`                 | Newsreader 400, -0.015em (sizes set per board, 22 to 34px)                                               |
| Italic accent `.it`                 | Newsreader italic 300, 1em (inside headlines)                                                            |
| Eyebrow / table head `.eyebrow .th` | Geist Mono 500, 11.5px, +0.08em, uppercase                                                               |
| `.spec` mono label                  | Geist Mono 11.5px, +0.06em (boards), colour `--muted`                                                    |
| Question headings                   | Geist 600, -0.01em (kept sans: employer text wraps)                                                      |
| Body                                | Geist 15px / 1.45, `-webkit-font-smoothing:antialiased`                                                  |
| KPI numbers                         | Newsreader 400, 34px, -0.02em                                                                            |
| Buttons                             | Geist 600, 14.5px (small: 13.5px)                                                                        |
| Chips / pills                       | 12.5px / 550                                                                                             |
| `kbd`                               | Geist Mono 11 to 11.5px, 1px border, 2px bottom border, radius 5 to 6px                                  |

Sizes in use across all boards (px, by frequency): 13 (most), 12, 12.5, 14, 13.5, 11, 10.5, 15, 16, 14.5, 17, 34 (metrics), 42 to 46 (page titles), 56 to 72 (hero). Weights: 600 (dominant), 550, 650, 500, 400, 700, 350.

## 4. Shape, spacing, elevation

- **Radii (px):** `99` (pills, chips, badges; most used), `50%` (avatars, dots), `5-6` (kbd, tiny chips), `9-10` (small buttons), `12` (inputs, buttons), `14` (option cards), `16` (sub-panels), `18-22` (cards), `20` (tables, cards), `24` (form sections, metric cells), `28` (hero panels).
- **Gaps (px):** 4, 6, 8, 10, 12, 14, 16, 18, 24 (6, 12 and 8 dominate). No fixed spacing scale in the source: use these values as-is rather than rounding.
- **Page padding:** header `22px 56px` (onboarding) / `14px 32px` (default `.top`); main content `20px 56px 34px`.
- **Elevation:** three levels only: flat (hairline `--line`), raised (`--bg` card on `--ground`), floating (`--float`, menus/popovers/tooltips). Dark mode lifts cards with `--bg:#1C1C1C` on `--ground:#141414`; it does not use shadows for depth.

## 5. Components (classes in `jp8.css`)

| Component         | Class          | Spec                                                                                                                                                                                                    |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button            | `.btn`         | min-height 42, padding 0 18, radius 12, 1.5px `--ink` border, transparent bg. `.pri` fills `--pri`; `.ghost` no border; `.neg` red outline; `.negf` red fill; `.sm` 34px / radius 10; `.ic` 38px square |
| Top bar           | `.top`         | 3-column grid (logo · pill nav · actions), transparent background over `--ground`                                                                                                                       |
| Pill nav          | `.pillnav .pn` | track `--bg` + 1px `--line`, radius 99, padding 4; item min-height 44, padding 0 18, 14.5px/500; active = `--pri` fill; count badge `.pn b`                                                             |
| Segmented control | `.seg`         | radius 12, 1px `--line`; active segment `--pri` fill; count pill inside at 18% of `--on-pri`                                                                                                            |
| Input             | `.inp`         | height 48, radius 12, 1px `--line-2`; focus `--ink` border + 3px ring at 14% `--ink`; error `--bad` border + 3px `--bad-tint` ring; disabled `--panel`                                                  |
| Field label       | `.lab`         | 13.5px / 600, 7px below                                                                                                                                                                                 |
| Radio/check card  | `.rc`, `.opt`  | radius 14, 1px `--line`; on = `--ink` border + 1px inset ring                                                                                                                                           |
| Table             | `.tbl .th .tr` | radius 20, header 42px on `--panel`, rows min 68px, 1px row dividers                                                                                                                                    |
| Card              | `.card`        | radius 20, 1px `--line`, `--bg`                                                                                                                                                                         |
| Form section      | `.fsec`        | radius 24, padding 28, h3 Newsreader 24                                                                                                                                                                 |
| Metric cell       | `.mcell`       | radius 24, padding 24 (dashboard KPIs: radius 20, padding 12 18)                                                                                                                                        |
| Chat bubble       | `.bub .a/.u`   | radius 20 with 6px tail corner; user bubble `--pri`                                                                                                                                                     |
| Composer          | `.comp`        | pill, min-height 54, send button 38 circle `--pri`                                                                                                                                                      |
| Status chip       | `.st`          | height 28, pill, glyph + label                                                                                                                                                                          |
| Switch            | `.switch`      | 44×26, on = `--brand`                                                                                                                                                                                   |
| Menu / popover    | `.menu .mi`    | radius 18, padding 6, `--float`; item min-height 42, radius 11                                                                                                                                          |
| Phone tab bar     | `.bottom`      | floating, radius 22, items min-height 56                                                                                                                                                                |
| Skeleton          | `.skel`        | shimmer 1.6s linear                                                                                                                                                                                     |

Interaction states (hover, focus, disabled, pending, error) for each component are drawn on the **Fixes**, **Forms**-style and **Settings** boards; read them there before implementing.

## 6. Motion (spec board: `V17_Motion.dc.html`)

- Durations: 120ms hover · 200ms state · 320ms enter · 600ms+ only for celebratory moments.
- Easing: out `cubic-bezier(.2,.8,.2,1)`, in-out `cubic-bezier(.65,0,.35,1)`, spring `cubic-bezier(.34,1.56,.64,1)`.
- Named animations in V17: `v17rise` (8px up + fade), `v17pop` (scale .6 to 1, spring), `v17cardin`, `v17land` (Cap lands on the dart), `v17lift` (take-off), `v17bob` (idle), `v17trail`, `v17ring`, `v17ripple`, `pulse` (live dot), `spin` (orbit), skeleton shimmer. Keyframes are in `jp8.css` and the `<style>` block of the onboarding boards.
- **Reduced motion:** every loop stops, state changes become a 120ms opacity fade (`@media (prefers-reduced-motion:reduce)` is present in every board).

## 7. Screens (67 boards) and canvas sizes

Layout is **fixed per device frame**, not fluid CSS: V17 defines no `max-width` breakpoints. The four frames are the breakpoints:

| Frame            | Size                                | Used by                                                                                                        |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Desktop          | 1440 wide (height varies per board) | all `V17_*` desktop boards                                                                                     |
| Tablet landscape | 1194×834                            | `Tab_Dash_Land`, `Tab_Inbox_Land` (table + 360px peek; inbox list + chat)                                      |
| Tablet portrait  | 834×1194                            | `Tab_Dash_Port` (compact table + slide-over peek)                                                              |
| Phone            | 390×844                             | `Phone_Dash`, `Phone_Peek` (90% bottom sheet), `Phone_Status` (action sheet), `Phone_Inbox`, `Phone_Analytics` |

Desktop boards (each exists as `_L` and `_D`, except Flow map, Handoff and Motion, which are single):

| Board                           | Size            | Screen                               |
| ------------------------------- | --------------- | ------------------------------------ |
| `Dash_Applied`                  | 1440×960        | Dashboard, Applied view (landing)    |
| `Dash_Peek`                     | 1440×960        | Peek panel open on a row             |
| `Dash_Status`                   | 1440×960        | Status picker, search filter         |
| `Dash_Empty`                    | 1440×960        | Empty search result                  |
| `CV_Viewer`                     | 1440×960        | CV viewer, exact sent version        |
| `UpNext`                        | 1440×1080       | Up next queue                        |
| `AddJobs`                       | 1440×960        | Add jobs sheet                       |
| `Extension`                     | 1440×1024       | Browser extension popup              |
| `Fixes`                         | 1440×1250       | Manual control (states)              |
| `Inbox`                         | 1440×1000       | Inbox                                |
| `Inbox_Pilot`                   | 1440×1270       | Cap pilot thread                     |
| `Inbox_Clear`                   | 1440×900        | All clear                            |
| `TakeOver`                      | 1440×1000       | Take over a tab                      |
| `CmdK`                          | 1440×960        | Command box                          |
| `CmdK_Answer`                   | 1440×720        | Command box answer                   |
| `Analytics`                     | 1440×1135       | Analytics                            |
| `Settings`                      | 1440×1260       | Settings sheet                       |
| `Profile`                       | 1440×1546       | Profile and documents                |
| `On1_Welcome` ... `On5_Liftoff` | 1440×760 to 900 | Onboarding, 5 steps                  |
| `On_Empty`                      | 1440×900        | Dashboard, first day                 |
| `FlowMap`                       | 1440×1120       | Screen map and clicks-per-task table |
| `Handoff`                       | 1440×744        | What the design needs underneath     |
| `Motion`                        | 1440×3950       | Motion spec (light only)             |

Navigation (from `FlowMap`): Dashboard, Inbox and Analytics sit in the top bar on every screen; **⌘K Ask Cap** reaches the rest; Settings and the account menu are the gear and avatar. Landing = Dashboard · Applied.

Keyboard model (from the boards' footers): `/` search, `Esc` clear/close, `⌘K` command box, `⌘V` add jobs, `J`/`K` move through rows, `S` status, `T`/`H` take over / hand back, `⌫` remove, `⌘Z` undo, `,` settings.

## 8. Implementation rules (Electron renderer)

1. Tokens go in one Tailwind v4 `@theme` block (and a `.dark` override) generated from [`design/tokens.json`](../design/tokens.json); no hard-coded hex outside the Cap/brand SVGs.
2. Fonts bundled as local files (see section 3). The CSP forbids remote hosts.
3. Theme = `.dark` class on the root, switched by OS preference with a manual override (`prefers-color-scheme` default).
4. Every screen is compared against its board in **both** themes with a pixel-diff screenshot test at the board's size. A board screenshot is the acceptance test.
5. The icon set is inline stroke SVG (1.8 to 2.2 stroke, round caps/joins, 24×24), as in the boards; copy paths from the board that uses them.
6. Reduced-motion rules from the boards are mandatory, not optional.

## 9. Known gaps in the source (decide before building)

- `jp8.css` is a **cumulative cascade** (v13 to v17). Values in section 2 are the resolved result; rules for classes V17 does not use still sit in the file and must not be copied into the app.
- No hover/active/disabled drawings exist for every control; where a board lacks one, derive it from the nearest drawn state and note it in the PR.
- The V17 dashboard shows 62 sample applications; the numbers are placeholder data, not product claims.
- Handoff board lists backend work the design assumes (CV pin at submit, queue ordering, take-over lock, job chat history, analytics endpoint). That is outside this frontend repo until an API is chosen.
