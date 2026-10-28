# Changelog

## [0.2.0](https://github.com/sadowb/jobPilot/compare/v0.1.0...v0.2.0) (2026-10-28)


### ⚠ BREAKING CHANGES

* **runs:** run table is the queue — drop liteque, native Claude session resume, crew 4 ([#148](https://github.com/sadowb/jobPilot/issues/148))

### Features

* **observability:** keep pino, drop pino-roll; crash diagnostics and export ([#166](https://github.com/sadowb/jobPilot/issues/166)) ([4b60a4d](https://github.com/sadowb/jobPilot/commit/4b60a4d6af2200efa00cd401713f846ad9926a6a))


### Bug Fixes

* **browsers,ats:** keep Neo error codes, narrow snapshot parse, honour Retry-After ([#149](https://github.com/sadowb/jobPilot/issues/149)) ([07f491e](https://github.com/sadowb/jobPilot/commit/07f491eb1c0e5a0c45d27b3193cb17284c9d23a8)), closes [#142](https://github.com/sadowb/jobPilot/issues/142) [#147](https://github.com/sadowb/jobPilot/issues/147) [#143](https://github.com/sadowb/jobPilot/issues/143)
* **build:** name macOS helper bundles after the app ([#158](https://github.com/sadowb/jobPilot/issues/158)) ([5ce8e3d](https://github.com/sadowb/jobPilot/commit/5ce8e3de77714d0e231e2dd6c9b5320d4818f6ad))
* **dashboard,postings:** accessible tab switch, search focus ring, posting country ([#156](https://github.com/sadowb/jobPilot/issues/156)) ([27cd181](https://github.com/sadowb/jobPilot/commit/27cd181b74c9c06f2ca0a1ad97307a47c3cde358))
* **dashboard:** status picker filter input, stat labels, chip wrap, remove sample data ([#150](https://github.com/sadowb/jobPilot/issues/150)) ([1c76a30](https://github.com/sadowb/jobPilot/commit/1c76a30c8e1a7c0f7a1fbce634b40d109fe46b3e)), closes [#133](https://github.com/sadowb/jobPilot/issues/133) [#134](https://github.com/sadowb/jobPilot/issues/134) [#136](https://github.com/sadowb/jobPilot/issues/136) [#139](https://github.com/sadowb/jobPilot/issues/139)
* **onboarding:** persist completion, keep answers on Back, step 3 copy ([#152](https://github.com/sadowb/jobPilot/issues/152)) ([f3d0094](https://github.com/sadowb/jobPilot/commit/f3d0094a49eabf23c13bc0d665310c005a5b481f)), closes [#135](https://github.com/sadowb/jobPilot/issues/135) [#131](https://github.com/sadowb/jobPilot/issues/131) [#138](https://github.com/sadowb/jobPilot/issues/138)
* **release:** DMG missing from release assets ([#155](https://github.com/sadowb/jobPilot/issues/155)) ([15ee3ff](https://github.com/sadowb/jobPilot/commit/15ee3ffba5e658867a505ef681da5f1a57efd478))
* **settings:** persist settings, disable autopilot toggle, read saved crew size ([#151](https://github.com/sadowb/jobPilot/issues/151)) ([477b521](https://github.com/sadowb/jobPilot/commit/477b521131a5c3c77150ebb4e903313f495de302)), closes [#95](https://github.com/sadowb/jobPilot/issues/95) [#130](https://github.com/sadowb/jobPilot/issues/130) [#137](https://github.com/sadowb/jobPilot/issues/137)


### Code Refactoring

* **runs:** run table is the queue — drop liteque, native Claude session resume, crew 4 ([#148](https://github.com/sadowb/jobPilot/issues/148)) ([3cb42b2](https://github.com/sadowb/jobPilot/commit/3cb42b2d8cbadcb2966a5bbc032b01167707e08b))

## 0.1.0 (2026-10-28)


### ⚠ BREAKING CHANGES

* **memory:** Mnemosyne MCP memory in every run ([#128](https://github.com/sadowb/jobPilot/issues/128))

### Features

* **agents:** detect owner Claude CLI and update settings contracts ([#79](https://github.com/sadowb/jobPilot/issues/79)) ([ff62a3c](https://github.com/sadowb/jobPilot/commit/ff62a3c3ed664957ec262d0a3815c1fa3a260859))
* **agents:** implement Claude Agent SDK provider ([#56](https://github.com/sadowb/jobPilot/issues/56)) ([d61ac8b](https://github.com/sadowb/jobPilot/commit/d61ac8bd0e2c94a441e42214299267ebec16c79d))
* **app:** JobPilot app icon and menu replace Electron defaults ([#112](https://github.com/sadowb/jobPilot/issues/112)) ([11b0421](https://github.com/sadowb/jobPilot/commit/11b0421b8ae9e3abd7f144bd9375bf324083ed23))
* **applications:** add URL ingestion, IPC and shared DTO contracts ([#31](https://github.com/sadowb/jobPilot/issues/31)) ([612c76f](https://github.com/sadowb/jobPilot/commit/612c76fa0d9344e540ebb1dafc4537875d7f7654))
* **browsers:** add Neo per-run tab provider ([#42](https://github.com/sadowb/jobPilot/issues/42)) ([9a0334c](https://github.com/sadowb/jobPilot/commit/9a0334cf8a1a228b4077ec0c93d39a20a00c198f))
* **dashboard:** port V17 Dashboard family, Add jobs and Extension ([5269765](https://github.com/sadowb/jobPilot/commit/5269765646cf9bbb85d81c5a556872b45b754ce1))
* finalize phase zero schema contracts ([1475566](https://github.com/sadowb/jobPilot/commit/14755661cd930cedcaec8d5c59c7cdc32c9165af))
* **inbox:** port V17 Inbox family, ⌘K command box and manual-control board ([4b55b70](https://github.com/sadowb/jobPilot/commit/4b55b70d0454e05da1b7a6b17cf7cd8e2292dfae))
* **memory:** Mnemosyne MCP memory in every run ([#128](https://github.com/sadowb/jobPilot/issues/128)) ([88fc13a](https://github.com/sadowb/jobPilot/commit/88fc13a07f546f5dec35a9fdd69e4386ee7959aa)), closes [#82](https://github.com/sadowb/jobPilot/issues/82)
* open settings from the gear and the ',' key ([342c650](https://github.com/sadowb/jobPilot/commit/342c650e1425bac706267c7d1668b7432b7e1e48))
* **platform:** add Windows discovery and CI build job ([#123](https://github.com/sadowb/jobPilot/issues/123)) ([5d24081](https://github.com/sadowb/jobPilot/commit/5d24081584b58c98bb48e38ab27ea79bdb8c8857)), closes [#120](https://github.com/sadowb/jobPilot/issues/120)
* **platform:** bootstrap encrypted database and observability ([896353a](https://github.com/sadowb/jobPilot/commit/896353af32103954e494506a39162c85e49ea2a1))
* **platform:** bootstrap encrypted database and observability ([f15be53](https://github.com/sadowb/jobPilot/commit/f15be5305db3f3245aa5167b558a80a5c38e6cfa))
* port V17 onboarding, first-day dashboard, settings sheet, profile, analytics and motion ([5dbbd76](https://github.com/sadowb/jobPilot/commit/5dbbd7688584b3c0556a0caab97a2f5d340b47b8))
* **postings:** add ATS ingestion and fill plans ([#3](https://github.com/sadowb/jobPilot/issues/3)) ([2c6122e](https://github.com/sadowb/jobPilot/commit/2c6122e9fa5e9f3ab67718814d26124099528cf6))
* **postings:** bulk add jobs and extend shared ingest DTO ([#64](https://github.com/sadowb/jobPilot/issues/64)) ([#65](https://github.com/sadowb/jobPilot/issues/65)) ([cbf9c1d](https://github.com/sadowb/jobPilot/commit/cbf9c1d1bf5ba7137565875c99f15dac63377e3e))
* **profile:** persist profile and answers with shared DTO contracts ([#32](https://github.com/sadowb/jobPilot/issues/32)) ([56a687b](https://github.com/sadowb/jobPilot/commit/56a687bd17fc8bbdaf1e6422d9813fe6185be426))
* **profile:** V18h About me, market-aware answers, standardised data ([e4f035b](https://github.com/sadowb/jobPilot/commit/e4f035be6161c66b20c97086f33013e62371bf6a))
* refine macOS shell, appearance, and personal profile ([6bc5574](https://github.com/sadowb/jobPilot/commit/6bc55743ca8dcb6daca884f67b1d676cb1ef39e0))
* **renderer:** TanStack Query + IPC-event invalidation ([#127](https://github.com/sadowb/jobPilot/issues/127)) ([1ea392c](https://github.com/sadowb/jobPilot/commit/1ea392cef57a53dc226d2e87b2239c6ce5c3bf91)), closes [#89](https://github.com/sadowb/jobPilot/issues/89)
* **runs:** add apply queue and lifecycle with shared DTO contracts ([#52](https://github.com/sadowb/jobPilot/issues/52)) ([28ac760](https://github.com/sadowb/jobPilot/commit/28ac760410a7af9e09823434d248b672675da817))
* **runs:** wire Claude and Neo into queue, restore 6 parallel default ([#40](https://github.com/sadowb/jobPilot/issues/40), [#88](https://github.com/sadowb/jobPilot/issues/88)) ([#99](https://github.com/sadowb/jobPilot/issues/99)) ([6737f29](https://github.com/sadowb/jobPilot/commit/6737f29978e0d5cdc3787c43b4b3a39913df7fe2))
* scaffold Electron + Vite + React + Tailwind app with V17 tokens, fonts and hardened shell ([0c1dfb8](https://github.com/sadowb/jobPilot/commit/0c1dfb8e9679a20033b6f975a6c0e0307580145a))
* **secrets:** Claude API key storage, Settings, and IPC contracts ([#69](https://github.com/sadowb/jobPilot/issues/69)) ([8865b09](https://github.com/sadowb/jobPilot/commit/8865b09066b0d18a0b9eae40551266a9091f3449))
* **tools:** real-Electron visual regression capture and diff ([eeaf698](https://github.com/sadowb/jobPilot/commit/eeaf698cdb080860966aeb33e79ff4588eac00e9))
* **ui:** finish dashboard, add-jobs and extension Tailwind migration ([2c3f511](https://github.com/sadowb/jobPilot/commit/2c3f5113c5167177a02a76b9d5e7b98954cb7d74))
* **ui:** finish inbox Tailwind migration (Codex gpt-6-luna; visual parity pending real-app check) ([5c3d871](https://github.com/sadowb/jobPilot/commit/5c3d8716a5f47375d292ed6b4ac2887473e47d67))
* **ui:** finish misc Tailwind migration (Codex gpt-6-luna; visual parity pending real-app check) ([da83b96](https://github.com/sadowb/jobPilot/commit/da83b96c7e30ba24fe21b1e4c51c2ca0dc6f7219))
* **ui:** finish profile Tailwind migration (Codex gpt-6-luna; visual parity pending real-app check) ([572a3bc](https://github.com/sadowb/jobPilot/commit/572a3bcba4d00d6912de125de24cfd68f39d54d9))
* **ui:** finish shell Tailwind migration (Codex gpt-6-luna; visual parity pending real-app check) ([814f8a1](https://github.com/sadowb/jobPilot/commit/814f8a1c17b08c49232231c6c7c80c53e6575816))
* **ui:** Tailwind form and dialog primitives (migration phase 0) ([070f81a](https://github.com/sadowb/jobPilot/commit/070f81a567b538397bb4cf40721926f133b1741b))
* **ui:** Tailwind foundation: dark variant, motion tokens, Button/Card/Tile/Status/Kbd/Eyebrow primitives ([5ea33e3](https://github.com/sadowb/jobPilot/commit/5ea33e37179cb054d7f85cd150a5c8ca68e6ebf8))


### Bug Fixes

* **a11y:** restore reduced motion styles ([4075e3f](https://github.com/sadowb/jobPilot/commit/4075e3f71eb4f2427451e8230f50dd64396545f0))
* **build:** never inline fonts as data URIs (CSP font-src 'self'); drop Placeholder, route FirstDay ([57ee49e](https://github.com/sadowb/jobPilot/commit/57ee49ec58f36c3db356f4aa9c8f5b4954d41c5b))
* **ci:** share signing identity across upgrade builds ([#13](https://github.com/sadowb/jobPilot/issues/13)) ([1c3044b](https://github.com/sadowb/jobPilot/commit/1c3044bffe02e632eb5759f94fbd68dd4100ad94))
* **db:** back up daily while the app stays open ([#34](https://github.com/sadowb/jobPilot/issues/34)) ([92e592f](https://github.com/sadowb/jobPilot/commit/92e592f6e938cdf7b3405a12f8a34724083d4c10))
* **ipc:** return typed validation errors without handler noise ([#77](https://github.com/sadowb/jobPilot/issues/77)) ([d812857](https://github.com/sadowb/jobPilot/commit/d81285736fcd749b9bf41cee568defab3951eead))
* **platform:** verify packaged builds and encrypted backups ([159a9d4](https://github.com/sadowb/jobPilot/commit/159a9d48f4ada75c2ed3861b26b76677915ba533))
* **postings:** pin public DNS addresses and constrain redirects ([#53](https://github.com/sadowb/jobPilot/issues/53)) ([f382f91](https://github.com/sadowb/jobPilot/commit/f382f91591c0f8d87b07a21b919a4945231a51c0))
* **postings:** polish add-job preview (country names, company, question count) ([#94](https://github.com/sadowb/jobPilot/issues/94)) ([e4bbdc2](https://github.com/sadowb/jobPilot/commit/e4bbdc26bbd65e2b08b59012901add18355c71d3))
* **postings:** resolve Workable short links to tenant URLs ([#76](https://github.com/sadowb/jobPilot/issues/76)) ([ac52905](https://github.com/sadowb/jobPilot/commit/ac52905902dbcd79d60c30b39a1f7a8146e25d64))
* **preload:** bundle zod into the sandboxed preload; run E2E launch journey in CI ([97089b1](https://github.com/sadowb/jobPilot/commit/97089b1f7c749f80af226a5b2f4f66653fc1a304))
* redact nested secrets and add recovery-key IPC contract ([#15](https://github.com/sadowb/jobPilot/issues/15)) ([768ab1c](https://github.com/sadowb/jobPilot/commit/768ab1c1a93523a99393eb41f1039bb3a7905b25))
* **renderer:** Agent card polish, Fixes and Profile fit ([#116](https://github.com/sadowb/jobPilot/issues/116)) ([9aa63d8](https://github.com/sadowb/jobPilot/commit/9aa63d8db46f35e54e935ec270fb0d46514c710a)), closes [#101](https://github.com/sadowb/jobPilot/issues/101) [#113](https://github.com/sadowb/jobPilot/issues/113) [#114](https://github.com/sadowb/jobPilot/issues/114)
* **renderer:** onboarding back control, named progress, plain copy ([#110](https://github.com/sadowb/jobPilot/issues/110)) ([c49fbf1](https://github.com/sadowb/jobPilot/commit/c49fbf17c4e1df4d8bfc68065a236090ddf64782))
* **renderer:** remove duplicate ATS detection ([#54](https://github.com/sadowb/jobPilot/issues/54)) ([7939f48](https://github.com/sadowb/jobPilot/commit/7939f481c0a2aca178d1b46048dcc278d37483c5))
* **renderer:** show onboarding and real empty states on first launch ([#80](https://github.com/sadowb/jobPilot/issues/80)) ([607ff14](https://github.com/sadowb/jobPilot/commit/607ff1452fb8320d521e6addc0bcdd70d97624d8))
* **styles:** repair index.css keyframes after inbox/dashboard merge ([fce713e](https://github.com/sadowb/jobPilot/commit/fce713e13fa4fa39bd3da0c96e77d131dfae0466))
* **ui:** dashboard dialogs pixel parity (add jobs, CV viewer) ([7ef7ed3](https://github.com/sadowb/jobPilot/commit/7ef7ed304303776cbd122d2194a857ba2211e36f))
* **ui:** onboarding, first-day, settings, analytics pixel parity ([5868907](https://github.com/sadowb/jobPilot/commit/586890782da6992d56776774863311bd4e77fa71))
* **ui:** profile pixel parity after Tailwind migration ([732abf8](https://github.com/sadowb/jobPilot/commit/732abf85b1947f016492448e10d195c8a80731ac))
* validate IPC responses in preload ([af018e2](https://github.com/sadowb/jobPilot/commit/af018e29d71ad6df63dd3043fc280d2ea6deb651))
* **visual:** seed sqlite profile and application fixtures for capture ([#109](https://github.com/sadowb/jobPilot/issues/109)) ([77dcaae](https://github.com/sadowb/jobPilot/commit/77dcaae9453c8efc01ddbadb79a29b36e93a5347)), closes [#74](https://github.com/sadowb/jobPilot/issues/74)
