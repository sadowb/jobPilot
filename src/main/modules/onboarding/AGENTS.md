# modules/onboarding

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: the P1 pre-flight (detect agents and browser tools, "Allow both"), the P2 CV reader and Cap chat turn, and nothing else. P3 and the profile saves are renderer-side over the existing profile IPC.
- **Files**: `preflight.service.ts` (detection + allow/test, calls `GrantsService`), `cv.service.ts` + `cv-text.ts` (PDF only, via `unpdf`, parsed in a utility process; magic bytes decide the format, 60k character cap), `cap-turn.service.ts` (free-text turn; allow-listed fact kinds only), `structured-call.ts` (tool-less, ephemeral agent call with a zod output schema), `onboarding.controller.ts` (IPC, native file picker for a custom agent).
- **Notes**: the CV is untrusted data in the prompt, never instructions; every agent output is parsed with zod and nothing is saved here. The renderer holds the extraction as a draft and commits it to the profile only on "Ready for take-off". Models are listed from the agent at runtime (`agent.service.models()`), never hard-coded; Opus is filtered out. All agent calls go through the gated provider (see `modules/grants`).
