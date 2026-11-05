# modules/inbox

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: inbox_thread, inbox_message, email_signal; view v_inbox
- **Files**: `inbox.controller.ts` (IPC), `inbox.service.ts`, `inbox.repository.ts`, `inbox.entity.ts` (contract, exists), `inbox.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Questions the agent cannot answer, approval requests and employer email. Resolving a `needs_answer` thread writes the answer to `application_answer`, offers it to `answer_library`, and re-queues the application with the run `session_id` to resume.

Chat (#242): each application has one `system` thread (`Chat with agent`) holding the owner's and the agent's messages (`inbox.service.ts` `InboxChatService`). A send saves the owner message and returns at once (`SendChatResult`); the reply then streams as `ChatEvent`s keyed by chat (application id, or `cap`) and reply id (`chat-turns.ts`: one in flight per chat, `chat:cancel` aborts and keeps the partial text, the first delta is never batched, later ones are coalesced per 40 ms). The turn is a plain-text `streamText` run with no MCP servers, so it can stream; if it fails the note is still saved. `chat:warm` (chat opened) lets the provider start a tool-less Claude ahead (`AgentSettingsService.warm`, one spare, dropped after 90 s idle). The first-token time is on the `done` event and logged at debug (`first_chunk_ms`). The owner's newest messages go into the next fill prompt as data (`runs.service.ts`), never as rules. Nothing here can approve or submit.

Context (#259): `describe()` also carries a scrubbed profile summary, stored CV text, the fill plan and saved answers (`chat-context.ts`, pure). Notes vs answers (#256): `notes-precedence.ts` builds the run-prompt rules; the owner's saved answers are listed in the prompt payload and outrank notes.
