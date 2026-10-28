# ADR 0017: Replace liteque with p-queue

- Status: accepted (supersedes [ADR 0003](0003-liteque.md))
- Decision: The apply queue is an in-memory `p-queue` (`autoStart: false`, `pause()`/`start()`, concurrency from settings, one `AbortController` per run, dedupe by run id). Memory consolidation is a `setTimeout` to the next 03:00 plus the last successful pass time in the settings table. liteque is removed.
- Rationale: liteque 0.10.0 `Runner.runImpl` checks `stopping` only before waiting on a slot, so `stop()` could still claim a job (we carried a dequeue override). It also recovers crashed `running` rows by lease expiry and re-runs them, which would auto-resume a half-filled application. We also wrote raw SQL against its `tasks` table, and it left an unencrypted queue file in `userData`.
- What guarantees correctness: the `run` table is authoritative. At startup `RunsService.initialize` fails `running` rows ("app restarted") and re-enqueues `queued` rows. One active run per application is still the partial unique index.
- Consequence: no queue persistence, by design; the queue is rebuilt from `run` on every launch. Old `apply-queue.db*` and `memory-queue.db*` files are deleted at startup. A missed consolidation night runs once at the next launch (last run older than the previous 03:00).
