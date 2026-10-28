// Fails every electron-builder run (dist, dist:dir, verify) on a symlinked node_modules:
// the packager then silently drops production deps ("cannot find path for dependency") and exits 0 (#141).
import { lstatSync } from 'node:fs';

export default async function beforePack(context) {
  if (lstatSync(`${context.packager.projectDir}/node_modules`).isSymbolicLink())
    throw new Error(
      'node_modules is a symlink, so electron-builder would ship without its dependencies. Run `npm ci` in this checkout.',
    );
}
