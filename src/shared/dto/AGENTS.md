# shared/dto

Types and zod schemas that cross the main/preload/renderer boundary. No Electron, Node or React imports (this folder is type-checked for the web too). `enums.ts` is the single source of the closed value sets used by the DB CHECK constraints: changing it requires a new migration. `*Item`/row interfaces here mirror the SQL views; update both together.
