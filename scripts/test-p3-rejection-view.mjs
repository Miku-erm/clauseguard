// Real browser UI replay of a retained real model rejection, NOT fresh inference.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { startFixture } from './serve-fixture.mjs';
const directory = 'docs/evidence/p3-rejection-view'; mkdirSync(directory, { recursive: true });
let context; let server; let failure; let concurrentResults; const network = [];
try {
  server = startFixture(); await once(server, 'listening');
  const executable = process.env.CLAUSEGUARD_CHROME ?? JSON.parse(readFileSync('docs/evidence/p1-verified/environment.json', 'utf8')).executable;
  const extension = resolve('.output/chrome-mv3'); context = await chromium.launchPersistentContext(resolve(`.local/p3-rejection-${randomUUID()}`), { executablePath: executable, channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking', '--disable-component-update'] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const id = new URL(worker.url()).host;
  context.on('request', request => { if (request.url().endsWith('/api/chat')) network.push(request.url()); });
  const source = await context.newPage(); const popup = await context.newPage(); await source.goto('http://127.0.0.1:4173/p2/injection.html'); await source.bringToFront(); await popup.goto(`chrome-extension://${id}/popup.html`);
  const concurrent = await popup.evaluate(async () => (await Promise.allSettled([chrome.runtime.sendMessage({ type: 'START_SCAN' }), chrome.runtime.sendMessage({ type: 'START_SCAN' })])).map(result => result.status));
  concurrentResults = concurrent;
  if (concurrent.filter(status => status === 'fulfilled').length !== 1 || concurrent.filter(status => status === 'rejected').length !== 1) throw new Error('Concurrent popup requests started duplicate scans');
  let scan;
  for (let index = 0; index < 100; index++) { scan = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan); if (scan?.state === 'READY') break; await new Promise(r => setTimeout(r, 50)); }
  if (scan?.state !== 'READY') throw new Error('Replay fixture did not extract');
  const report = JSON.parse(readFileSync('docs/evidence/p2-model-current/injection.json', 'utf8')).report; const jobId = randomUUID();
  if (scan.documents[0].contentHash !== report.documentHash || !report.rejectedFindingCount) throw new Error('Preserved response does not match actual source version');
  await popup.evaluate(async ({ report, jobId }) => { const stored = await chrome.storage.session.get('uiSession'); await chrome.storage.session.set({ uiSession: { ...stored.uiSession, jobId }, lastAnalysis: { jobId, status: 'FINISHED', report } }); }, { report, jobId });
  await popup.getByText(/desteklenmeyen bulgu dışlandı/).waitFor(); await popup.getByText('Güvenilir risk puanı hesaplanamadı.').waitFor();
  const next = context.waitForEvent('page'); await popup.getByRole('button', { name: 'Ayrıntılı Raporu Aç' }).click(); const page = await next;
  await page.getByTestId('risk-score').filter({ hasText: 'Güvenilir risk puanı hesaplanamadı.' }).waitFor();
  if (await page.locator('blockquote').count() !== report.findings.length) throw new Error('Rejected proposal was rendered as accepted evidence');
  await page.getByText(/doğrulanmış hukuki sorunlar değildir/).waitFor(); await page.screenshot({ path: `${directory}/rejected-report-replay.png`, fullPage: true });
  if (network.length) throw new Error('Replay unexpectedly ran inference');
} catch (error) { failure = String(error); }
finally { writeFileSync(`${directory}/integration.json`, JSON.stringify({ measuredAt: new Date().toISOString(), status: failure ? 'FAIL' : 'PASS', failure, concurrentPopupRequests: concurrentResults, provenance: 'Retained real P2 model response, freshly verified source hash, artificial UI test job ID; no fresh inference.', inferenceCalls: network.length }, null, 2)); await context?.close(); server?.close(); }
console.log(JSON.stringify({ status: failure ? 'FAIL' : 'PASS', failure })); if (failure) process.exitCode = 1;
