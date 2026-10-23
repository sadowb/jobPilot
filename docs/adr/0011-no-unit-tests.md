# ADR 0011: No unit tests

- Status: accepted
- Decision: Do not add unit tests. Verify with typecheck, lint, build, database checks, and Haiku-run Playwright `_electron` journeys against the built app and real job URLs.
- Rationale: The owner chose end-to-end checks as the acceptance signal for a UI-led desktop product.
- Consequence: Changes should include focused runtime or assert-based smoke checks where required by the ponytail skill, without introducing a unit-test suite.
