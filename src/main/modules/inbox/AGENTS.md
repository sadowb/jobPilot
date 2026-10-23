# modules/inbox

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: inbox_thread, inbox_message, email_signal; view v_inbox
- **Files**: `inbox.controller.ts` (IPC), `inbox.service.ts`, `inbox.repository.ts`, `inbox.entity.ts` (contract, exists), `inbox.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Questions the agent cannot answer, approval requests and employer email. Resolving a `needs_answer` thread writes the answer to `application_answer`, offers it to `answer_library`, and re-queues the application with the run `session_id` to resume.
