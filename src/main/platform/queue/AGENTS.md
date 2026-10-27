# platform/queue

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

liteque queue setup: `apply` queue (default concurrency 6, configurable). Mnemosyne consolidation and maintenance run when idle. Queue payloads carry ids only. Pause/resume and cancel (abort the SDK run, close the owned tab) live here. Quit stops admission, drains shutdown work and ends owned children/tabs; optional battery pause follows ADR 0016.
