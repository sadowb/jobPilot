# ADR 0010: Pull request review flow

- Status: accepted
- Decision: Implementers work in task-specific branches and worktrees, open PRs with the repository template, and a separate reviewer checks architecture and ponytail notes. Merge only after CI and Haiku's Playwright result are green.
- Rationale: Independent review catches contract drift and verifies the built app's real journeys.
- Consequence: Do not push from a task worktree without explicit authorization; record skipped and unverified work in the PR.
