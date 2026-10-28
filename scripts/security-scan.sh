#!/usr/bin/env bash
# Static security scans shared by ci.yml and release.yml, so both always run the same checks.
# Each scanner writes a report; the check-*.mjs scripts fail the job on findings or a missing report.
set -euo pipefail
out="${RUNNER_TEMP:-$(mktemp -d)}"

pipx run semgrep==1.182.1 scan --config .semgrep/ --error --metrics=off

# Electronegativity cannot detect Electron's version on its own and would audit against v0.1.0 defaults.
npx --yes @doyensec/electronegativity@1.10.3 -i src --parser-plugins typescript,jsx \
  -e "$(node -p "require('electron/package.json').version")" -o "$out/electronegativity.sarif" || true
node scripts/check-electronegativity.mjs "$out/electronegativity.sarif"

curl -fsSL https://github.com/google/osv-scanner/releases/download/v2.7.0/osv-scanner_linux_amd64 -o "$out/osv-scanner"
echo "160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b  $out/osv-scanner" | sha256sum -c -
chmod +x "$out/osv-scanner"
"$out/osv-scanner" scan source --lockfile package-lock.json --format json > "$out/osv-results.json" || true
node scripts/check-osv.mjs "$out/osv-results.json"
