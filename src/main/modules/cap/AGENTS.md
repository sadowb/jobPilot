# modules/cap

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: cap_conversation, cap_message
- **Files**: `cap.controller.ts` (IPC), `cap.service.ts`, `cap.repository.ts`, `cap.entity.ts` (contract, exists), `cap.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Cap chat = the configured agent + Mnemosyne MCP + a tracker summary. Stores the transcript and the agent `session_id` to resume.

Pilot chat (#243, #255): `CapChatService` is a read-only turn over a jobs overview whose reply STREAMS (plain text, `ChatTurns` in `modules/inbox/chat-turns.ts`: `thinking` -> `delta`* -> `done` events on `chat:event`, Esc/`chat:cancel` aborts and keeps the partial text). Notes for a job's agent are a separate cheap tool-less step after the visible reply (`passNotes`, then an `actions` event), so they never delay the text. It may relay a note to a real job's thread (`Via Cap: ...`; an unknown application id is dropped), and can never approve, send or click. When the owner installed memory, each turn also gets `mnemosyne_recall`/`mnemosyne_remember` only (the same allow-list as runs), so Cap remembers preferences across chats; without it a turn sees the jobs overview and the last 10 messages. Structured access to the rest of the app's data is not built (issue linked in PR #249).
