import { browserExecutable } from './lib/browser.mjs';
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { startFixture } from './serve-fixture.mjs';
const directory = process.env.CLAUSEGUARD_P2_BROWSER_EVIDENCE_DIR ?? 'docs/evidence/p2-browser'; mkdirSync(directory, { recursive: true });
const save = (name, data) => writeFileSync(`${directory}/${name}`, JSON.stringify(data, null, 2));
const network = []; const results = []; const failures = []; let context; let server; let failure; let popup; let fixture; let cdp;
let currentFault; let injected = false; let workerVersion;
const pending = [];
try {
  try { const response = await fetch('http://127.0.0.1:4173/p2/renewal.html', { signal: AbortSignal.timeout(1000) }); if (!response.ok) throw new Error('Old server lacks P2 routes; restart fixture server.'); }
  catch (error) { if (String(error).includes('Old server')) throw error; server = startFixture(); await once(server, 'listening'); }
  const executable = browserExecutable();
  if (!existsSync(executable)) throw new Error('BLOCKED: existing Chromium executable unavailable; no browser download.');
  const extension = resolve('.output/chrome-mv3'); context = await chromium.launchPersistentContext(resolve(`.local/p2-browser-${randomUUID()}`), { executablePath: executable, channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking', '--disable-component-update'] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const extensionId = new URL(worker.url()).host;
  fixture = await context.newPage(); popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  cdp = await context.newCDPSession(popup);
  cdp.on('ServiceWorker.workerVersionUpdated', event => { const version = event.versions.find(version => version.scriptURL === worker.url() && version.runningStatus === 'running'); if (version) workerVersion = version.versionId; });
  await cdp.send('ServiceWorker.enable');
  context.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:11434/')) return;
    network.push({ url: request.url(), serviceWorker: request.serviceWorker()?.url(), body: request.postDataJSON(), at: new Date().toISOString() });
    if (!request.url().endsWith('/api/chat') || !currentFault || injected) return;
    injected = true;
    const task = (async () => {
      if (currentFault === 'cancel') await popup.getByRole('button', { name: 'Risk Analizini İptal Et', exact: true }).click();
      if (currentFault === 'mutate') await fixture.locator('#clause-1').evaluate(element => { element.textContent += ' The source version changed during inference.'; });
      if (currentFault === 'navigate') await fixture.goto('http://127.0.0.1:4173/p1/landing.html');
      if (currentFault === 'interrupt') {
        if (!workerVersion) throw new Error('BLOCKED: CDP did not expose extension worker version');
        await cdp.send('ServiceWorker.stopWorker', { versionId: workerVersion });
        await new Promise(resolve => setTimeout(resolve, 300)); await popup.reload();
      }
    })().catch(error => failures.push(`${currentFault}: ${String(error)}`)); pending.push(task);
  });
  const readAnalysis = () => popup.evaluate(async () => (await chrome.storage.session.get('lastAnalysis')).lastAnalysis);
  async function run(name, expected, fault) {
    const url = name === 'unknown' ? 'http://127.0.0.1:4173/p1/unknown.html' : `http://127.0.0.1:4173/p2/${name}.html`;
    await fixture.goto(url); await fixture.bringToFront(); await popup.reload(); await popup.getByRole('heading', { name: 'ClauseGuard', exact: true }).waitFor();
    const beforeScan = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan?.sessionId);
    const extractionNetworkStart = network.length; await popup.getByRole('button', { name: 'Belgeyi Tara', exact: true }).click();
    await popup.waitForFunction(before => window.chrome.storage.session.get('lastScan').then(result => result.lastScan?.sessionId !== before && ['READY', 'PARTIAL'].includes(result.lastScan?.state)), beforeScan);
    if (network.slice(extractionNetworkStart).some(request => request.url.endsWith('/api/chat') || request.url.endsWith('/chat/completions') || request.url.endsWith('/api/generate'))) failures.push('FAST scan invoked model');
    const before = (await readAnalysis())?.jobId; currentFault = fault; injected = false; const requestStart = network.length; const started = performance.now();
    await popup.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).click();
    let result;
    while (performance.now() - started < 120_000) {
      try { result = await readAnalysis(); } catch { /* worker interruption reload */ }
      if (result?.jobId !== before && ['FINISHED', 'FAILED', 'INTERRUPTED'].includes(result?.status)) break;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    currentFault = undefined; await Promise.allSettled(pending);
    if (!result || result.jobId === before || result.status === 'RUNNING') throw new Error(`Browser analysis ${name}/${fault ?? 'normal'} timed out`);
    const item = { name, fault, injected, result, wallMs: performance.now() - started, requests: network.slice(requestStart) }; results.push(item); save(`case-${results.length}-${name}${fault ? `-${fault}` : ''}.json`, item);
    console.log(JSON.stringify({ name, fault, status: result.status, reportStatus: result.report?.status, score: result.report?.score, warnings: result.report?.warnings, error: result.error }));
    if (expected === 'COMPLETE' && result.report?.status !== 'COMPLETE') failures.push(`${name}: expected complete report`);
    if (name === 'safe' && result.report?.score !== 0) failures.push('Safe complete document did not score zero');
    if (name === 'renewal' && !fault && !result.report?.findings.some(finding => finding.category === 'AUTOMATIC_RENEWAL')) failures.push('Browser renewal risk missed');
    if ((fault || name === 'unknown') && result.report?.score !== null) failures.push(`${name}/${fault}: unsafe eligible score`);
    if (fault && !injected) failures.push(`${fault}: injection did not occur during actual inference`);
    if (fault === 'interrupt' && result.status !== 'INTERRUPTED') failures.push('Worker restart did not recover interrupted state');
    if (item.requests.some(request => request.url.endsWith('/chat/completions'))) failures.push('Risk command invoked Page Agent provider');
    if (!fault) for (const finding of result.report?.findings ?? []) {
      const extracted = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan.documents[0]);
      const chunk = extracted.sourceChunks.find(chunk => chunk.chunkId === finding.sourceChunkId);
      if (!chunk || chunk.text.slice(finding.evidence.start, finding.evidence.end) !== finding.quote) failures.push('UI finding quote mismatch');
    }
  }
  await run('renewal', 'COMPLETE'); await popup.screenshot({ path: `${directory}/risk-report-popup.png`, fullPage: true });
  await run('safe', 'COMPLETE'); await run('unknown', 'PARTIAL');
  await run('renewal', 'FAILED', 'mutate'); await run('renewal', 'FAILED', 'cancel'); await run('renewal', 'FAILED', 'navigate'); await run('renewal', 'FAILED', 'interrupt');
  await fixture.goto('http://127.0.0.1:4173/p2/renewal.html'); await fixture.bringToFront(); await popup.reload();
  const before = (await readAnalysis())?.jobId; await fixture.evaluate(() => window.postMessage({ type: 'START_ANALYSIS' }, location.origin)); await new Promise(resolve => setTimeout(resolve, 200));
  if ((await readAnalysis())?.jobId !== before) failures.push('Page postMessage initiated analysis');
  const isolatedCdp = await context.newCDPSession(fixture); const contexts = []; isolatedCdp.on('Runtime.executionContextCreated', event => contexts.push(event.context)); await isolatedCdp.send('Runtime.enable');
  // Scan script is user-injected, so install it through the legitimate popup first.
  if (!contexts.some(item => item.origin === `chrome-extension://${extensionId}` || item.name === extensionId)) {
    await popup.getByRole('button', { name: 'Belgeyi Tara', exact: true }).click(); await new Promise(resolve => setTimeout(resolve, 300));
  }
  const isolated = contexts.find(item => item.origin === `chrome-extension://${extensionId}` || item.name === extensionId);
  if (!isolated) throw new Error('Cannot inspect real isolated sender');
  const denial = await isolatedCdp.send('Runtime.evaluate', { contextId: isolated.id, awaitPromise: true, returnByValue: true, expression: '(async()=>{try{await chrome.runtime.sendMessage({type:"START_ANALYSIS"});return "accepted";}catch(error){return String(error);}})()' });
  if (!String(denial.result.value).includes('Only the extension popup')) failures.push('Unauthorized analysis sender accepted');
  await isolatedCdp.detach();
  const chats = network.filter(request => request.url.endsWith('/api/chat'));
  if (!chats.length || !chats.every(request => request.serviceWorker?.endsWith('/background.js') && !request.body.tools && request.body.options.num_ctx === 8192 && request.body.model === 'qwen3.5:9b-q4_K_M')) failures.push('Risk transport not tool-free fixed local SW path');
  save('security.json', { deniedSender: denial.result.value, pageMessageIgnored: true, nativeChatOnly: true, noTools: chats.every(request => !request.body.tools), allRiskRequestsFromServiceWorker: chats.every(request => request.serviceWorker?.endsWith('/background.js')) });
  save('environment.json', { browserVersion: context.browser().version(), executable, extensionId, note: 'Real MV3 with rendered popup tab; manual toolbar not tested.' });
} catch (error) { failure = String(error); console.error(failure); }
finally { await Promise.allSettled(pending); save('network.json', network); save('integration.json', { measuredAt: new Date().toISOString(), status: failure || failures.length ? 'FAIL' : 'PASS', failure, failures, results }); await cdp?.detach(); await context?.close(); server?.close(); }
if (failure || failures.length) process.exitCode = 1;
