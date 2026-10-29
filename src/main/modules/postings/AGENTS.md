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
