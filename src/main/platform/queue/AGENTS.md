# platform/queue

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

`ApplyWorker` is a slot scheduler, not a queue: the `run` table is the queue and a slot claims the oldest `queued` row with one atomic UPDATE (default crew 4, read live from settings; ADR 0017). It also owns the stuck watchdog. Mnemosyne consolidation is a plain timer to 03:00 plus a persisted last-success time for catch-up. Queue payloads carry ids only. Pause/resume and cancel (abort the SDK run, close the owned tab) live here. Quit stops admission, drains shutdown work and ends owned children/tabs; optional battery pause follows ADR 0016.
