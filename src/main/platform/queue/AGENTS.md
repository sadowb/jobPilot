# platform/queue

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

liteque queue setup: `apply` queue (default concurrency 6, configurable), nightly Mnemosyne consolidation. Queue payloads carry ids only. Pause/resume and cancel (abort the SDK run, close the tab) live here.
