# modules/documents

Read the [root AGENTS.md](../../../../AGENTS.md) first (layering, logging, schema rules).

- **Owns**: document, document_version
- **Files**: `documents.controller.ts` (IPC), `documents.service.ts`, `documents.repository.ts`, `documents.entity.ts` (contract, exists), `documents.dto.ts` (zod input/output; shared row types go in `src/shared/dto/`).
- **Notes**: Versions are immutable; edits create a new `document_version`. Files live under userData/documents (path stored relative). Verify sha256 on read. The native Save dialog export stays here.
