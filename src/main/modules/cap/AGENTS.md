# modules/cap

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: cap_conversation, cap_message
- **Files**: `cap.controller.ts` (IPC), `cap.service.ts`, `cap.repository.ts`, `cap.entity.ts` (contract, exists), `cap.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Cap chat = the configured agent + Mnemosyne MCP + a tracker summary. Stores the transcript and the agent `session_id` to resume.
