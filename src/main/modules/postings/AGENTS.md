# modules/postings

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: company, job_posting, posting_question, answer_library
- **Files**: `postings.controller.ts` (IPC), `postings.service.ts`, `postings.repository.ts`, `postings.entity.ts` (contract, exists), `postings.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Resolves a URL to a posting: public ATS adapters in `ats/` (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, BambooHR) with undici + zod; HTML fallback with linkedom; unknown sites become `ats = custom`. De-duplicate by `canonical_url`. Pre-resolves answers from `answer_library` into a fill plan.

## Custom pages and the agent reader ([ADR 0018](../../../../docs/adr/0018-agent-reads-custom-sites.md))

- `fetchPosting(url, readCustom?)`: a custom page with JobPosting JSON-LD is verified without an agent. Without it, `PostingService` passes a `readCustom` callback: the stored agent read for that canonical URL (cache, never re-runs), else `PostingReader.read` (own tab, snapshot/click/scroll tools (no typing), Haiku, 120 s, max 2 concurrent) mapped by `toPostingForm` into a verified `source = 'agent'` posting.
- `isJobPosting: false` throws `NotAJobPageError` with the agent's reason. A failed read or no configured agent returns `null`, so the apply-form heuristic decides and the result carries an owner-facing `note` (`ok` result) or a suffix on the message.
- The page is untrusted: never put page text in the reader prompt, never widen `READER_TOOLS`, never add a free-form field to `AgentPostingSchema`. Everything the agent returns goes through the ATS normalisers (`str`, `question`, `salaryRange`, `toCountryCode`).
- `ingest(url, signal)` is cancelled through `postings:cancel-ingest`; `postings:read-state` tells the add-jobs row the agent is reading.

## Schema-first fill plan (#237)

- `ats/schema.ts`: one `AtsSchemaAdapter` per ATS that publishes its form definition (Greenhouse `?questions=true` first; Lever and Ashby add an adapter, nothing else changes). The response is zod-bounded, stripped of control/format characters and capped (`MAX_SCHEMA_FIELDS`, option and label lengths) because it is remote text that ends up in the agent prompt. Fetch is bounded by `SCHEMA_DEADLINE_MS` and the run's signal.
- `fill-plan.ts` (pure): resolves each real field name from the owner's answers, the confirmed profile (wins over the CV), the answer library, then the CV; maps free values onto the form's option labels (`mapNumberToOption`, `matchOption`). Each entry is `fill | select | upload_cv | draft | skip | ask`; nothing is dropped silently.
- `PostingService.planFill` returns the page-reading plan (`origin: 'page'`) when the ATS has no adapter or the definition cannot be fetched. `RunsService.execute` turns `ask` entries into Inbox questions (file asks into blockers) before any tab opens; answers to stable questions (`rememberAnswers`) land in `answer_library`.
- Greenhouse extras (#257): the API's `education` flag adds five synthetic inputs (`education.school|degree|discipline|start|end`); degrees, disciplines and a school search (`/education/*`) supply the form's own option spellings and are best-effort. Demographic questions (`answer_options`, no input name) become `demographic_<id>`. `phone` entries carry a libphonenumber split (country, calling code, national number). The API does not expose conditional questions: labels like "If yes, ..." are skipped upfront, and the run prompt makes the agent return every revealed required field in one `needs_answers`.
