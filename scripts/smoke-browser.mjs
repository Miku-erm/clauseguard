// Real post-build smoke check. No inference, no policy click, no mocked responses.
import { chromium } from 'playwright-core';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import { startFixture } from './serve-fixture.mjs';
const evidence = resolve(process.env.CLAUSEGUARD_EVIDENCE_DIR ?? 'docs/evidence');
const environment = JSON.parse(readFileSync(join(evidence, 'browser-environment.json'), 'utf8'));
const report = JSON.parse(readFileSync('public/gpu-verification.json', 'utf8'));
let context;
let server;
try {
  try { await fetch('http://127.0.0.1:4173/fixture.html', { signal: AbortSignal.timeout(1000) }); }
  catch { server = startFixture(); await once(server, 'listening'); }
  const extension = resolve('.output/chrome-mv3');
  context = await chromium.launchPersistentContext(resolve(`.local/browser-smoke-${randomUUID()}`), {
    executablePath: environment.executablePath, channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking'],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const fixture = await context.newPage();
  const popup = await context.newPage();
  await fixture.goto('http://127.0.0.1:4173/fixture.html');
  await fixture.bringToFront();
  await popup.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
  await fixture.bringToFront();
  await popup.reload();
  await popup.getByText('Connected', { exact: true }).waitFor();
  const packagedReport = await worker.evaluate(async () => (await fetch(chrome.runtime.getURL('gpu-verification.json'))).json());
  const currentUrl = await popup.getByTestId('current-url').textContent();
  const unchanged = await fixture.locator('#privacy-policy').evaluate(element => element.hidden);
  if (packagedReport.measuredAt !== report.measuredAt || currentUrl !== 'http://127.0.0.1:4173/fixture.html' || !unchanged) throw new Error('Final artifact smoke assertions failed');
  await popup.screenshot({ path: join(evidence, 'popup-final-build.png'), fullPage: true });
  const result = { status: 'PASS', measuredAt: new Date().toISOString(), currentUrl, modelConnected: true,
    historicalReportTimestamp: packagedReport.measuredAt, historicalGpuStatus: packagedReport.status,
    fixtureRemainsHidden: unchanged, note: 'Real final artifact load and popup smoke only; no additional agent attempt.' };
  writeFileSync(join(evidence, 'browser-final-smoke.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await context?.close(); if (server) await new Promise(resolve => server.close(resolve)); }
