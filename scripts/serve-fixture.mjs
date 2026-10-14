import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function startFixture({ llmsScenario = 'valid' } = {}) {
  const routes = new Map([
    ['/fixture.html', [fileURLToPath(new URL('../fixtures/fixture.html', import.meta.url)), 'text/html; charset=utf-8']],
    ['/fixture.js', [fileURLToPath(new URL('../fixtures/fixture.js', import.meta.url)), 'text/javascript; charset=utf-8']],
  ]);
  for (const name of ['risk', 'negative', 'expandable', 'incomplete', 'llms-landing', 'flow', 'incomplete-flow']) {
    routes.set(`/demo/${name}.html`, [fileURLToPath(new URL(`../fixtures/demo/${name}.html`, import.meta.url)), 'text/html; charset=utf-8']);
  }
  routes.set('/demo/fixture.js', [fileURLToPath(new URL('../fixtures/demo/fixture.js', import.meta.url)), 'text/javascript; charset=utf-8']);
  if (['valid', 'malformed', 'malicious', 'outside'].includes(llmsScenario)) routes.set('/llms.txt', [fileURLToPath(new URL(`../fixtures/llms/${llmsScenario}.txt`, import.meta.url)), 'text/plain; charset=utf-8']);
  for (const name of ['visible', 'hidden', 'multiple', 'long', 'landing', 'noisy', 'dynamic', 'injection', 'ambiguous', 'partial']) {
    routes.set(`/p1/${name}.html`, [fileURLToPath(new URL(`../fixtures/p1/${name}.html`, import.meta.url)), 'text/html; charset=utf-8']);
  }
  routes.set('/p1/fixture.js', [fileURLToPath(new URL('../fixtures/p1/fixture.js', import.meta.url)), 'text/javascript; charset=utf-8']);
  // Same documents without a registered coverage/action contract: exercise UNKNOWN and read-only fallback.
  routes.set('/p1/unknown.html', [fileURLToPath(new URL('../fixtures/p1/visible.html', import.meta.url)), 'text/html; charset=utf-8']);
  routes.set('/p1/unknown-hidden.html', [fileURLToPath(new URL('../fixtures/p1/hidden.html', import.meta.url)), 'text/html; charset=utf-8']);
  for (const name of ['renewal', 'sharing', 'denial', 'cancellation', 'ambiguous', 'injection', 'safe', 'long']) {
    routes.set(`/p2/${name}.html`, [fileURLToPath(new URL(`../fixtures/p2/${name}.html`, import.meta.url)), 'text/html; charset=utf-8']);
  }
  const server = createServer(async (request, response) => {
    const route = routes.get(request.url);
    if (request.method !== 'GET' || !route) { response.writeHead(404); response.end('Not found'); return; }
    try {
      response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; frame-src ${['/demo/flow.html', '/demo/incomplete-flow.html'].includes(request.url) ? 'chrome-extension:' : "'none'"}; form-action 'none'` });
      response.end(await readFile(route[0]));
    } catch { response.writeHead(500); response.end('Fixture read error'); }
  });
  server.listen(4173, '127.0.0.1');
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startFixture(); console.log('Fixture: http://127.0.0.1:4173/fixture.html (loopback only)');
}
