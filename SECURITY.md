# Security policy

JobPilot stores job-application data, encrypted credentials and agent output on the user's machine, so security reports get priority over feature work.

## Supported versions

Pre-release: only the latest [release](https://github.com/sadowb/jobPilot/releases) and `main` receive fixes.

## Reporting a vulnerability

Do **not** open a public issue, discussion or PR.

Report privately through GitHub: **Security** tab → **Report a vulnerability** ([direct link](https://github.com/sadowb/jobPilot/security/advisories/new)). Include the affected version or commit, steps to reproduce, and the impact you expect.

You can expect an acknowledgement within 7 days and a status update at least every 14 days until it is fixed or declined. Once a fix ships we publish a GitHub security advisory and credit you unless you ask otherwise.

## Scope

In scope: the desktop app and its build/release pipeline in this repository, for example renderer-to-main IPC escapes, SQLCipher key handling, credential leaks in logs or traces, SSRF in posting fetches, prompt injection from job pages that leads to unintended actions, and supply-chain issues in CI.

Out of scope: third-party job sites, the Claude CLI/API, Bitwarden, and findings that need an already-compromised machine or user account.
