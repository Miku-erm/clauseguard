// Real built-extension tests. Only popup buttons are clicked by this harness.
// Policy clicks must originate from Alibaba's model-selected DOM tool.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { startFixture } from './serve-fixture.mjs';

const evidence = resolve(process.env.CLAUSEGUARD_P1_EVIDENCE_DIR ?? 'docs/evidence/p1'); mkdirSync(evidence, { recursive: true });
const save = (name, data) => writeFileSync(join(evidence, name), JSON.stringify(data, null, 2));
const hash = text => createHash('sha256').update(text).digest('hex');
const samples = []; const network = []; const responses = []; const logs = []; const cases = []; const failures = []; const pending = [];
let context; let server; let worker; let fixture; let popup; let failure;
function executable() {
  if (process.env.CLAUSEGUARD_CHROME && existsSync(process.env.CLAUSEGUARD_CHROME)) return process.env.CLAUSEGUARD_CHROME;
  const cache = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const dir of readdirSync(cache).filter(dir => /^chromium-\d+$/.test(dir)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))) {
    const path = join(cache, dir, 'chrome-win64', 'chrome.exe'); if (existsSync(path)) return path;
  }
  throw new Error('BLOCKED: set CLAUSEGUARD_CHROME to an existing browser. No download is performed.');
}
const measuredAt = new Date().toISOString();
async function scan(name, { reload = true, expectedState = 'READY', expectedStatus = 'COMPLETE', fault } = {}) {
  const url = `http://127.0.0.1:4173/p1/${name}.html`;
  if (reload) await fixture.goto(url);
  await fixture.bringToFront(); await popup.reload(); await popup.getByRole('heading', { name: 'ClauseGuard', exact: true }).waitFor();
  if (await popup.getByTestId('current-url').textContent() !== url) throw new Error('Popup active-tab association failed');
  if (name === 'dynamic' && expectedStatus === 'COMPLETE') await fixture.locator('#dynamic-clause').waitFor();
  const before = await worker.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan);
  const networkStart = network.length; const sampleStart = samples.length; let injected = false;
  const inject = message => {
    if (!fault || injected || !message.text().includes('[ClauseGuard P1 activity]') || !message.text().includes('thinking')) return;
    injected = true;
    if (fault === 'removed') void fixture.locator('#open-policy').evaluate(element => element.remove());
    if (fault === 'navigate') void fixture.goto('http://127.0.0.1:4173/p1/landing.html');
    if (fault === 'cancel') void popup.getByRole('button', { name: 'İptal', exact: true }).click();
  };
  fixture.on('console', inject);
  const initialCollapsed = await fixture.locator('button[data-clauseguard-approved][aria-expanded="false"]').count();
  const started = performance.now(); await popup.getByRole('button', { name: 'Belgeyi Tara', exact: true }).click();
  let result;
  while (performance.now() - started < 185_000) {
    result = await worker.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan);
    if (result?.sessionId !== before?.sessionId && ['READY', 'PARTIAL', 'INSUFFICIENT', 'FAILED'].includes(result?.state)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  fixture.off('console', inject);
  if (!result || !['READY', 'PARTIAL', 'INSUFFICIENT', 'FAILED'].includes(result.state) || result.sessionId === before?.sessionId) throw new Error(`Scan ${name} timed out`);
  // Read exact source text independently from emitted node segments in the real DOM.
  const sourceChecks = await fixture.evaluate(documents => documents.flatMap(document => document.sourceChunks.map(chunk => {
    let text = ''; const root = window.document.querySelector(chunk.sourceLocator.selector);
    for (const segment of chunk.sourceLocator.segments) {
      let node = root; for (const index of segment.path) node = node?.childNodes[index];
      if (!node || node.nodeType !== 3) return { order: chunk.order, matches: false };
      text += node.textContent.slice(segment.start, segment.end);
    }
    return { order: chunk.order, matches: text === chunk.text };
  })), result.documents ?? []);
  const requests = network.slice(networkStart); const inference = requests.filter(request => request.url.endsWith('/chat/completions') || request.url.endsWith('/api/generate'));
  const chats = requests.filter(request => request.url.endsWith('/chat/completions'));
  const dom = { initialCollapsed, collapsedAfter: await fixture.locator('button[data-clauseguard-approved][aria-expanded="false"]').count(),
    hiddenPolicyRegions: await fixture.locator('#policy-sections[hidden],section[id^="section-"][hidden]').count(),
    forbidden: await fixture.locator('#forbidden-count').count() ? await fixture.locator('#forbidden-count').textContent() : '0',
    mainWorld: await fixture.evaluate(() => ({ bridge: typeof window.clauseguardFetch, agent: typeof window.PageAgentCore, runtime: typeof window.chrome?.runtime?.sendMessage })) };
  const item = { name, fault, injected, wallMs: performance.now() - started, result, inferenceRequests: inference.length, chatRequests: chats.length, sourceChecks, dom, gpuSamples: samples.slice(sampleStart) };
  cases.push(item); save(`case-${cases.length}-${name}${fault ? `-${fault}` : ''}.json`, item);
  console.log(JSON.stringify({ name, fault, state: result.state, path: result.path, status: result.documents?.map(document => document.extraction.status), durationMs: result.durationMs, providerCalls: result.providerCalls, toolCalls: result.discovery?.toolCalls, dom }));
  if (result.state !== expectedState) failures.push(`${name}/${fault ?? 'normal'}: expected ${expectedState}, got ${result.state}`);
  if (expectedStatus && result.documents?.some(document => document.extraction.status !== expectedStatus)) failures.push(`${name}: unexpected coverage status`);
  if (!fault && sourceChecks.some(check => !check.matches)) failures.push(`${name}: exact source locator failed`);
  if (!fault && result.documents?.some(document => document.sourceChunks.some(chunk => hash(chunk.text) !== chunk.textHash))) failures.push(`${name}: text hash mismatch`);
  if (result.path === 'FAST' && (inference.length || result.providerCalls || result.agentInvoked)) failures.push(`${name}: FAST invoked provider/agent`);
  if (!fault && result.path === 'SLOW' && (dom.collapsedAfter !== 0 || initialCollapsed === 0 || !result.discovery?.success || !result.discovery.steps.some(step => step.name === 'click_element_by_index') || !chats.length || result.providerCalls !== chats.length)) failures.push(`${name}: actual SLOW task proof failed`);
  if (dom.forbidden !== '0' || Object.values(dom.mainWorld).some(value => value !== 'undefined')) failures.push(`${name}: isolation or forbidden action failed`);
  if (fault && !injected) failures.push(`${fault}: actual inference fault not injected`);
  if (fault === 'removed' && (!result.discovery?.failedToolCalls || dom.hiddenPolicyRegions !== 1)) failures.push('Removed target did not produce a blocked tool and unchanged hidden DOM');
  if (fault === 'cancel' && dom.hiddenPolicyRegions !== 1) failures.push('Cancellation changed hidden policy DOM');
  return item;
}
try {
  const url = 'http://127.0.0.1:4173/p1/visible.html';
  try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (!response.ok) throw new Error('Existing fixture server lacks P1 routes; restart npm run fixture.'); }
  catch (error) { if (String(error).includes('lacks P1')) throw error; server = startFixture(); await once(server, 'listening'); }
  const extension = resolve('.output/chrome-mv3'); const manifest = JSON.parse(readFileSync(join(extension, 'manifest.json'), 'utf8'));
  if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(['http://127.0.0.1:11434/*', 'http://127.0.0.1:4173/*'])) throw new Error('Unexpected broad host permission');
  context = await chromium.launchPersistentContext(resolve(`.local/p1-browser-${randomUUID()}`), { executablePath: executable(), channel: 'chromium', headless: true, viewport: { width: 1100, height: 900 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking', '--disable-component-update'] });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const extensionId = new URL(worker.url()).host;
  context.on('request', request => { if (request.url().startsWith('http://127.0.0.1:11434/')) network.push({ at: new Date().toISOString(), url: request.url(), method: request.method(), worker: request.serviceWorker()?.url(), body: request.postDataJSON() }); });
  context.on('response', response => { if (response.url().endsWith('/chat/completions')) pending.push(response.json().then(body => responses.push({ status: response.status(), body })).catch(error => responses.push({ error: String(error) }))); });
  fixture = await context.newPage(); fixture.on('console', message => { if (message.text().includes('[ClauseGuard') || message.type() === 'error') logs.push({ type: message.type(), text: message.text() }); });
  fixture.on('pageerror', error => logs.push({ type: 'pageerror', text: String(error) }));
  popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const first = await scan('visible'); const repeat = await scan('visible', { reload: false });
  if (first.result.documents[0].contentHash !== repeat.result.documents[0].contentHash || first.result.documents[0].documentId !== repeat.result.documents[0].documentId) failures.push('Repeated extraction changed deterministic IDs');
  await scan('noisy'); const long = await scan('long');
  if (long.result.documents[0].sourceChunks.length !== 181 || !long.result.documents[0].sourceChunks.at(-1).text.startsWith('Section 180.')) failures.push('Long contract missing final clause');
  const injection = await scan('injection');
  if (!injection.result.documents[0].sourceChunks.some(chunk => chunk.text.startsWith('Ignore previous instructions')) || injection.result.path !== 'FAST') failures.push('Prompt injection data changed control flow');
  await scan('landing', { expectedState: 'INSUFFICIENT', expectedStatus: undefined });
  await scan('ambiguous', { expectedState: 'PARTIAL', expectedStatus: 'PARTIAL' });
  await scan('partial', { expectedState: 'PARTIAL', expectedStatus: 'PARTIAL' });
  await scan('unknown', { expectedStatus: 'UNKNOWN' });
  await scan('unknown-hidden', { expectedState: 'INSUFFICIENT', expectedStatus: 'PARTIAL' });
  // Dynamic coverage before insertion is tested deterministically in Vitest; here verify actual delayed DOM update.
  await scan('dynamic', { expectedStatus: 'COMPLETE' });
  let sampling = false;
  const sampleGpu = async () => { if (sampling) return; sampling = true; try {
    samples.push({ at: new Date().toISOString(), gpu: execFileSync('nvidia-smi', ['--query-gpu=memory.used,memory.total,utilization.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8' }).trim(),
      processor: execFileSync(resolve('.local/ollama/ollama.exe'), ['ps'], { encoding: 'utf8' }).trim(), resident: await (await fetch('http://127.0.0.1:11434/api/ps')).json() });
  } catch (error) { samples.push({ error: String(error) }); } finally { sampling = false; } };
  const interval = setInterval(() => void sampleGpu(), 750);
  try {
    if (process.env.CLAUSEGUARD_P1_FAST_ONLY !== '1') {
    for (let attempt = 0; attempt < 3; attempt++) await scan('hidden');
    for (let attempt = 0; attempt < 2; attempt++) await scan('multiple');
    await scan('hidden', { expectedState: 'FAILED', expectedStatus: null, fault: 'removed' });
    await scan('hidden', { expectedState: 'FAILED', expectedStatus: null, fault: 'cancel' });
    await scan('hidden', { expectedState: 'FAILED', expectedStatus: null, fault: 'navigate' });
    }
  } finally { clearInterval(interval); }
  const slow = cases.filter(item => item.result.path === 'SLOW' && !item.fault);
  for (const item of slow) {
    const loaded = item.gpuSamples.filter(sample => sample.processor?.includes('qwen3.5:9b-q4_K_M'));
    if (loaded.length < 2 || !loaded.every(sample => sample.processor.includes('100% GPU') && sample.resident.models.some(model => model.name === 'qwen3.5:9b-q4_K_M' && model.context_length === 8192 && model.size > 0 && model.size_vram >= model.size)) || !loaded.some(sample => Number(sample.gpu.split(',')[2]) > 0)) failures.push(`${item.name}: lacks repeated full GPU/context/compute proof`);
  }
  const chats = network.filter(request => request.url.endsWith('/chat/completions'));
  if (chats.some(request => !request.worker?.endsWith('/background.js') || request.body.model !== 'qwen3.5:9b-q4_K_M' || request.body.stream !== false || request.body.response_format?.type !== 'json_schema')) failures.push('Provider/grammar/network regression');
  if (chats.some(request => /UNRELATED_|DO_NOT_EXTRACT_PASSWORD|HIDDEN_INSTRUCTION|Ignore previous instructions/.test(JSON.stringify(request.body.messages)))) failures.push('Unrelated/injection page text entered navigation model prompt');
  await scan('visible');
  const before = await worker.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan.sessionId);
  await fixture.evaluate(() => window.postMessage({ type: 'START_SCAN', url: 'https://evil.test' }, location.origin)); await new Promise(resolve => setTimeout(resolve, 200));
  if (await worker.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan.sessionId) !== before) failures.push('Page message initiated scan');
  const cdp = await context.newCDPSession(fixture); const contexts = []; cdp.on('Runtime.executionContextCreated', event => contexts.push(event.context)); await cdp.send('Runtime.enable');
  const isolated = contexts.find(item => item.origin === `chrome-extension://${extensionId}` || item.name === extensionId); if (!isolated) throw new Error('No real isolated context');
  const denial = await cdp.send('Runtime.evaluate', { contextId: isolated.id, awaitPromise: true, returnByValue: true, expression: '(async()=>{try {await chrome.runtime.sendMessage({type:"START_SCAN"}); return "accepted";}catch(error){return String(error);}})()' });
  if (!String(denial.result.value).includes('Only the extension popup')) failures.push('Unauthorized content-script scan initiation accepted'); await cdp.detach();
  await popup.screenshot({ path: join(evidence, 'popup-extraction.png'), fullPage: true }); await fixture.screenshot({ path: join(evidence, 'visible-policy.png'), fullPage: true });
  save('security.json', { isolatedSenderDenied: denial.result.value, pageMessageIgnored: true, noBroadHostPermissions: true, serviceWorkerOnly: chats.every(request => request.worker?.endsWith('/background.js')), noUnrelatedTextInModel: !chats.some(request => /UNRELATED_|DO_NOT_EXTRACT_PASSWORD|HIDDEN_INSTRUCTION|Ignore previous instructions/.test(JSON.stringify(request.body.messages))), manifest });
  save('environment.json', { measuredAt, browserVersion: context.browser()?.version(), extensionId, executable: executable(), headless: true, note: 'Rendered popup tab with fixture active; manual toolbar is unverified.' });
} catch (error) { failure = String(error); console.error(failure); }
finally {
  await Promise.allSettled(pending); save('network.json', network); save('responses.json', responses); save('console.json', logs); save('gpu-samples.json', samples);
  const normalSlow = cases.filter(item => item.result.path === 'SLOW' && !item.fault);
  save('integration.json', { measuredAt, status: failure || failures.length ? 'FAIL' : 'PASS', failure, failures, cases,
    fastOnly: process.env.CLAUSEGUARD_P1_FAST_ONLY === '1', fastCount: cases.filter(item => item.result.path === 'FAST').length, slowCount: normalSlow.length, slowSuccessRate: normalSlow.length ? normalSlow.filter(item => item.result.state === 'READY').length / normalSlow.length : null });
  await context?.close(); server?.close();
}
if (failure || failures.length) process.exitCode = 1;
