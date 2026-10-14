import { defineConfig } from 'cypress';
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
let port, browser;
export default defineConfig({ video: false, screenshotOnRunFailure: true,
  screenshotsFolder: '.local/cypress-probe-screenshots',
  e2e: { baseUrl: 'http://127.0.0.1:4173', supportFile: false, specPattern: 'cypress/probe.cy.mjs',
    setupNodeEvents(on) {
      on('before:browser:launch', (_browser, launch) => {
        launch.extensions.push(resolve('.output/chrome-mv3'));
        launch.args = launch.args.filter(a => a !== '--disable-extensions');
        launch.args.push('--load-extension=' + launch.extensions.join(','));
        mkdirSync('docs/evidence/final', { recursive: true });
        writeFileSync('docs/evidence/final/cypress-launch.json', JSON.stringify({ args: launch.args, extensions: launch.extensions }, null, 2));
        port = Number(launch.args.find(a => a.startsWith('--remote-debugging-port='))?.split('=')[1]);
        return launch;
      });
      on('task', { async extensionId() {
        if (!port) throw Error('Cypress did not expose a debugging port');
        browser ??= await chromium.connectOverCDP('http://127.0.0.1:' + port);
        const context = browser.contexts()[0];
        const worker = context.serviceWorkers().find(w => w.url().endsWith('/background.js')) ?? await context.waitForEvent('serviceworker', { timeout: 10000, predicate: w => w.url().endsWith('/background.js') });
        return new URL(worker.url()).host;
      } });
      on('after:run', result => { mkdirSync('docs/evidence/final', { recursive: true }); writeFileSync('docs/evidence/final/cypress-probe.json', JSON.stringify({ totalFailed: result.totalFailed, totalPassed: result.totalPassed, port }, null, 2)); });
    } },
});
