# e2e

Playwright `_electron.launch` journeys run by Haiku testers against both the built app and the packaged `.app`. Every feature PR adds or extends a journey that drives the feature through the packaged app; bug fixes add the assertion that would have caught the bug. Use a throwaway `--user-data-dir` for every launch. These are the only automated behaviour tests (ADR 0011); post the result in the PR.
