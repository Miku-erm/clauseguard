import assert from 'node:assert/strict';
import { once } from 'node:events';
import { writeFileSync, mkdirSync } from 'node:fs';
import { rolldown } from 'rolldown';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { startFixture } from './serve-fixture.mjs';
mkdirSync('.local', { recursive: true }); mkdirSync('docs/evidence/final', { recursive: true });
const bundle = await rolldown({ input: 'src/extraction/llms-txt.ts', platform: 'node', external: ['zod/v4'] });
await bundle.write({ file: '.local/llms-testing.mjs', format: 'esm' }); await bundle.close();
const { discoverLlmsTxt } = await import(pathToFileURL(resolve('.local/llms-testing.mjs')));
const results = [];
for (const scenario of ['valid', 'missing', 'malformed', 'malicious', 'outside']) {
  const server = startFixture({ llmsScenario: scenario }); await once(server, 'listening');
  try {
    const result = await discoverLlmsTxt('http://127.0.0.1:4173/demo/llms-landing.html', (url, init) => fetch(url, { ...init, headers: { Connection: 'close' } }));
    assert.equal(result.status, scenario === 'missing' ? 'MISSING' : scenario === 'malformed' ? 'INVALID' : 'FOUND');
    if (['valid', 'malicious', 'outside'].includes(scenario)) {
      assert.deepEqual(result.links, [{ label: 'Subscription Terms', url: 'http://127.0.0.1:4173/demo/risk.html' }]);
      const policy = await fetch(result.links[0].url, { headers: { Connection: 'close' } }); assert.equal(policy.status, 200); await policy.text();
    }
    assert(!JSON.stringify(result).includes('SYSTEM')); results.push({ scenario, result, pass: true });
  } finally { server.closeAllConnections(); await new Promise(done => server.close(done)); }
}
writeFileSync('docs/evidence/final/llms-integration.json', JSON.stringify({ at: new Date().toISOString(), actualHttpFetch: true, results }, null, 2));
console.log('PASS: five actual HTTP llms.txt discovery/fallback scenarios');
