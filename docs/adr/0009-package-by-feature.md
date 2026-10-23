# ADR 0009: Package by feature

- Status: accepted
- Decision: Organize main-process business code into feature modules using controller, service, repository, and entity layers; keep cross-cutting adapters in platform.
- Rationale: Feature ownership keeps changes cohesive while preserving explicit boundaries.
- Consequence: Controllers do not contain business rules or SQL; modules call other modules through services.
