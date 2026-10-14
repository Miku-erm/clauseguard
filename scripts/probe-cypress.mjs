import cypress from 'cypress';
import { browserExecutable } from './lib/browser.mjs';
import { startFixture } from './serve-fixture.mjs';
import { once } from 'node:events';
delete process.env.ELECTRON_RUN_AS_NODE;
const server = startFixture(); await once(server, 'listening');
try {
  const result = await cypress.run({ browser: browserExecutable(), configFile: 'cypress.probe.config.mjs', headless: true });
  process.exitCode = result.totalFailed || result.failures || 0;
} finally { server.closeAllConnections(); await new Promise(done => server.close(done)); }
