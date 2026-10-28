# platform/queue

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

In-memory `p-queue` apply queue (default concurrency 6, configurable; nothing persisted, ADR 0017). Mnemosyne consolidation is a plain timer to 03:00 plus a persisted last-success time for catch-up. Queue payloads carry ids only. Pause/resume and cancel (abort the SDK run, close the owned tab) live here. Quit stops admission, drains shutdown work and ends owned children/tabs; optional battery pause follows ADR 0016.
