# platform/ipc

Read the [root AGENTS.md](../../../../AGENTS.md) first. `platform/*` must not import from `modules/*` or `app/*`.

Typed registry: `defineHandler(channel, zodSchema, handler)` + `registerIpc`. Every call is checked (main frame of a window loaded from the app origin) and zod-parsed before the handler runs. Add channels to `src/shared/ipc.ts`, expose them in `src/preload/index.ts`, register the module controller in `app/main.ts`.

Main -> renderer cache signal: `emitDataChanged({ entity, id })` (`events.ts`), called by services after a state change. The payload is validated by `DataChangedSchema`, carries no row data, and is a broadcast channel (no handler, listed in `scripts/ipc-manifest.mjs`).
