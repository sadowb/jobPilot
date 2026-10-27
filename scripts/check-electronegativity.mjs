import { readFileSync, existsSync } from 'node:fs';
import process from 'node:process';

const sarifPath =
  process.argv[2] ||
  (process.env.RUNNER_TEMP ? `${process.env.RUNNER_TEMP}/electronegativity.sarif` : '/tmp/electronegativity.sarif');

if (!existsSync(sarifPath)) {
  process.stderr.write(`Error: Electronegativity SARIF file not found at ${sarifPath}\n`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(sarifPath, 'utf8'));
} catch (err) {
  process.stderr.write(`Error: Failed to parse Electronegativity SARIF report: ${err.message}\n`);
  process.exit(1);
}

const targetChecks = new Set([
  'NODE_INTEGRATION_JS_CHECK',
  'NODE_INTEGRATION_HTML_CHECK',
  'WEB_SECURITY_JS_CHECK',
  'WEB_SECURITY_HTML_CHECK',
  'OPEN_EXTERNAL_JS_CHECK',
]);

const violations = [];

for (const run of report.runs ?? []) {
  for (const result of run.results ?? []) {
    // If the finding is suppressed via inline directive, skip it
    if (Array.isArray(result.suppressions) && result.suppressions.length > 0) {
      continue;
    }

    const ruleId = result.ruleId ?? '';
    // Flag if it matches target checks or is an error
    const isTarget = targetChecks.has(ruleId) || [...targetChecks].some((c) => ruleId.startsWith(c));
    const isHighOrError = result.level === 'error';

    if (isTarget || isHighOrError) {
      const loc = result.locations?.[0]?.physicalLocation;
      const file = loc?.artifactLocation?.uri ?? 'unknown';
      const line = loc?.region?.startLine ?? '?';
      const msg = result.message?.text ?? 'Security check violation';
      violations.push(`[${ruleId}] ${file}:${line} - ${msg}`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`Electronegativity found ${violations.length} misconfiguration(s):\n`);
  for (const v of violations) {
    process.stderr.write(`  - ${v}\n`);
  }
  process.exit(1);
}

process.stdout.write('Electronegativity check passed (0 Electron misconfigurations found).\n');
process.exit(0);
