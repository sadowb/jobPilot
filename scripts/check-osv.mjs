import { readFileSync, existsSync } from 'node:fs';
import process from 'node:process';

const jsonPath =
  process.argv[2] ||
  (process.env.RUNNER_TEMP ? `${process.env.RUNNER_TEMP}/osv-results.json` : '/tmp/osv-results.json');

if (!existsSync(jsonPath)) {
  process.stderr.write(`Error: OSV-Scanner JSON file not found at ${jsonPath}\n`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (err) {
  process.stderr.write(`Error: Failed to parse OSV-Scanner JSON report: ${err.message}\n`);
  process.exit(1);
}

const highVulns = [];
let totalVulns = 0;

for (const result of report.results ?? []) {
  for (const pkgEntry of result.packages ?? []) {
    const pkgName = pkgEntry.package?.name ?? 'unknown';
    const pkgVersion = pkgEntry.package?.version ?? 'unknown';

    for (const vuln of pkgEntry.vulnerabilities ?? []) {
      totalVulns++;
      const id = vuln.id ?? 'UNKNOWN';
      const summary = vuln.summary ?? vuln.details ?? 'No description';

      // Check database_specific severity (standard for GitHub/OSV advisories)
      const dbSev = vuln.database_specific?.severity?.toUpperCase?.() ?? '';
      const ecoSev = vuln.ecosystem_specific?.severity?.toUpperCase?.() ?? '';

      let isHigh = ['HIGH', 'CRITICAL'].includes(dbSev) || ['HIGH', 'CRITICAL'].includes(ecoSev);

      // Check numeric scores in severity array if present
      if (!isHigh && Array.isArray(vuln.severity)) {
        for (const s of vuln.severity) {
          const numScore = Number(s.score);
          if (Number.isFinite(numScore) && numScore >= 7.0) {
            isHigh = true;
            break;
          }
        }
      }

      if (isHigh) {
        const sevLabel = dbSev || ecoSev || 'HIGH';
        highVulns.push(`[${sevLabel}] ${id} in ${pkgName}@${pkgVersion}: ${summary}`);
      }
    }
  }
}

if (highVulns.length > 0) {
  process.stderr.write(`OSV-Scanner detected ${highVulns.length} High/Critical vulnerability(ies):\n`);
  for (const v of highVulns) {
    process.stderr.write(`  - ${v}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `OSV-Scanner check passed (0 High/Critical vulnerabilities in package-lock.json; ${totalVulns} total advisories evaluated).\n`,
);
process.exit(0);
