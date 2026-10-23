# e2e

Playwright `_electron.launch` journeys run by Haiku testers against the **built, unpackaged** app (`npm run build`, then `electron .`; the packaged app has the inspect fuse off). Journeys: add jobs, parallel runs reach `awaiting_approval`, answer in Inbox, approve. Use a throwaway `--user-data-dir`. These are the only automated behaviour tests (ADR 0011); post the result in the PR.
