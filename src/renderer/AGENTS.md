# renderer

Read the [root AGENTS.md](../../AGENTS.md) first. React UI; the design source is [docs/FRONTEND.md](../../docs/FRONTEND.md).

## Data

- **Components never call `window.jobpilot` directly.** Only the hooks in `src/lib/api.ts` do (plus bootstrap in `main.tsx` and `lib/theme.ts`). `grep -rn "window.jobpilot" src/renderer/src/features` must stay empty.
- **Reads are `useQuery`, writes are `useMutation`** that invalidate the keys they affect. Keys come only from the typed factory `queryKeys` in `src/lib/query.ts`; never inline a key array.
- **Main tells the renderer what changed, not what it is.** Services call `emitDataChanged({ entity, id })` after a state change; `connectDataEvents()` maps each event to `invalidateQueries`. Add a new entity to `DataChangedSchema` (`src/shared/ipc.ts`) and to `invalidateForChange`. No polling, no `refetchInterval`, no focus refetch.
- Do not copy query data into component state to keep it fresh. If a reducer needs the list, mirror it from `useQuery` data in one effect (see `pages/Dashboard.tsx`) and keep local-only state (selection, hold) across reloads.
