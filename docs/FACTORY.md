# Software factory

The loop is **issue → dispatch → PR → CI → review → merge → board**.

1. Create an issue using Feature, Bug, or Agent task. Write observable acceptance criteria, pick the module (or Factory / CI / docs), agent, and priority. Forms add their type label; select the milestone on GitHub. Keep module choices in the three forms aligned when adding modules.
2. Review the issue before dispatch: its text is untrusted input, and the agent has local filesystem access. Use Node 22.12+, authenticated `gh`, Git, and an authenticated `codex` CLI. From this checkout, preview:

   ```sh
   node scripts/dispatch.mjs 28 --dry-run
   ```

   Start an approved task with:

   ```sh
   node scripts/dispatch.mjs 28 --model gpt-6.1-sol --effort medium
   ```

   Dispatch reads the issue from `sadowb/jobPilot`, fetches `origin/main`, creates `~/jobPilot-wt/issue-28` on `issue-28-<title-slug>`, and runs `npm ci --ignore-scripts`. It saves the brief in `~/jobPilot-wt/logs/issue-28.md`, adds `in-progress`, then runs Codex with stdin from `/dev/null` and stdout/stderr in `~/jobPilot-wt/logs/issue-28.log`. It waits for Codex to exit and reports failures. Existing worktrees or branches are refused; inspect a failed dispatch before manually cleaning up or retrying. Dry-run only reads issue/ref data and prints the brief and command argument arrays; it creates nothing and adds no label.

   Dispatch refuses closed issues and accepts only issues authored by `sadowb` by default, including in dry-run mode. After reviewing another human's issue, the owner can explicitly allow that author with `--allow-author <login>`. Bot authors (`author.is_bot` or a login ending in `[bot]`) are always refused, even with an override: nightly ATS drift issues can contain live external API data. Refusals explain the reason before any dispatch changes occur.

3. The fixed brief invokes ponytail full, requires repository/module guidance, forbids local GUI/OS keystore use, and limits local checks to typecheck, lint, and format:check. The issue body follows as untrusted task data. Arguments go directly to child processes with no shell. This prevents shell interpolation; it cannot guarantee that an agent will reject every malicious instruction, so dispatch only reviewed issues.
4. The agent pushes and opens one PR using the template with `Fixes #28`. Required `static` and `app` CI checks cover security linting, build, and packaged/upgrade journeys. Read the run output and fix failures; never treat a local dry-run as real-dispatch coverage.
5. A reviewer checks the diff, architecture, acceptance criteria, and honest ponytail notes. The owner merges after green CI and the required E2E result. The closing reference closes the issue; move its board card to Done and remove `in-progress` (manual unless the board already automates it).

The Monday 06:13 UTC digest creates one `digest` issue per ISO week, listing recent merges, stale PRs, blocked/owner-action issues, and failed nightly runs from the last seven days. The workflow can also be dispatched manually. Its token has `actions: read` to list nightly runs; API failures stop the workflow.
