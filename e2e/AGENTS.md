# e2e

Playwright `_electron.launch` journeys run by Haiku testers against both the built app and the packaged app. Every feature PR adds or extends a journey that drives the feature through the packaged app; bug fixes add the assertion that would have caught the bug. Use a throwaway `--user-data-dir` for every launch. These are the only automated behaviour tests (ADR 0011); post the result in the PR.

## Screenshots are review evidence

Any journey that covers a renderer change saves light and dark screenshots of the changed screen at 1280×800 with realistic data: `await window.setViewportSize({ width: 1280, height: 800 })`, then `await window.screenshot({ path: testInfo.outputPath('<screen>-light.png') })` (and `-dark.png` after switching the theme). CI uploads every `test-results/**/*.png` as the `screenshots-<run>` artifact on every run, and the reviewer compares them to the approved mockup before merging. Green journeys alone don't prove the UI is right.
