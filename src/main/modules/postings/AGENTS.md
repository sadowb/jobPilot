# modules/postings

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: company, job_posting, posting_question, answer_library
- **Files**: `postings.controller.ts` (IPC), `postings.service.ts`, `postings.repository.ts`, `postings.entity.ts` (contract, exists), `postings.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Resolves a URL to a posting: public ATS adapters in `ats/` (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, BambooHR) with undici + zod; HTML fallback with linkedom; unknown sites become `source = custom` and the agent discovers the form. De-duplicate by `canonical_url`. Pre-resolves answers from `answer_library` into a fill plan.
