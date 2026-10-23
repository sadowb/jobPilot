import { spawnSync } from 'node:child_process';

const [app, identity] = process.argv.slice(2);
if (!app || !identity) throw new Error('Usage: node scripts/sign-app.mjs <app> <identity>');

const result = spawnSync('codesign', ['--force', '--deep', '--sign', identity, '--timestamp=none', app], {
  stdio: 'inherit',
});
if (result.status !== 0) process.exit(result.status ?? 1);
