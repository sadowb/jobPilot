import { net, protocol } from 'electron';
import { join, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// Must run before app is ready.
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

export function serveRenderer(): void {
  const root = join(__dirname, '../renderer');
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    if (url.host !== 'jobpilot') return new Response('not found', { status: 404 });
    const relative = normalize(decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const target = join(root, relative);
    if (target !== root && !target.startsWith(root + sep)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(target).toString());
  });
}
