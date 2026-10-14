// Real integration: actual built MV3 extension, Alibaba packages and loopback Ollama.
// No mocked LLM and no manually clicked policy button.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { startFixture } from './serve-fixture.mjs';

const evidence = resolve(process.env.CLAUSEGUARD_EVIDENCE_DIR ?? 'docs/evidence');
mkdirSync(evidence, { recursive: true });
const save = (name, data) => writeFileSync(join(evidence, name), JSON.stringify(data, null, 2));
const fixtureUrl = 'http://127.0.0.1:4173/fixture.html';
function browserExecutable() {
  if (process.env.CLAUSEGUARD_CHROME && existsSync(process.env.CLAUSEGUARD_CHROME)) return process.env.CLAUSEGUARD_CHROME;
  const cache = join(process.env.LOCALAPPDATA, 'ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter(dir => /^chromium-\d+$/.test(dir)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))) {
      for (const name of ['chrome-win64', 'chrome-win']) {
        const executable = join(cache, dir, name, 'chrome.exe');
        if (existsSync(executable)) return executable;
      }
    }
  }
  throw new Error('BLOCKED: no existing Chromium/Chrome-for-Testing binary. Set CLAUSEGUARD_CHROME; this script never downloads a browser.');
}

const attempts = [];
const network = [];
const logs = [];
const responses = [];
const responseTasks = [];
const requestIds = new WeakMap();
let requestSequence = 0;
const functionalFailures = [];
let context;
let server;
let failure;
const measuredAt = new Date().toISOString();
const isolatedProfile = resolve(`.local/browser-test-${randomUUID()}`);
const ordinaryAttempts = Number(process.env.CLAUSEGUARD_ATTEMPTS ?? 5);
if (!Number.isInteger(ordinaryAttempts) || ordinaryAttempts < 3 || ordinaryAttempts > 10) throw new Error('Use 3 to 10 ordinary attempts');
try {
  const executablePath = browserExecutable();
  try { await fetch(fixtureUrl, { signal: AbortSignal.timeout(1000) }); }
  catch { server = startFixture(); await once(server, 'listening'); }
  const extension = resolve('.output/chrome-mv3');
  if (!existsSync(join(extension, 'manifest.json'))) throw new Error('Run npm run build before the browser integration');
  context = await chromium.launchPersistentContext(isolatedProfile, {
    executablePath, channel: 'chromium', headless: true, viewport: { width: 1100, height: 900 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking', '--disable-component-update'],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 15000 });
  const extensionId = new URL(worker.url()).host;
  writeFileSync(resolve('.local/extension-id.txt'), extensionId);
  const browserVersion = context.browser()?.version() ?? 'unknown';
  context.on('request', request => {
    if (request.url().startsWith('http://127.0.0.1:11434/')) {
      const body = request.postDataJSON();
      const requestId = ++requestSequence;
      requestIds.set(request, requestId);
      // Only the fixed fictional fixture is visited. Never record request headers,
      // credentials or content from arbitrary user pages.
      network.push({ requestId, url: request.url(), method: request.method(), serviceWorker: request.serviceWorker()?.url() ?? null,
        model: body?.model, stream: body?.stream, max_tokens: body?.max_tokens, reasoning_effort: body?.reasoning_effort,
        messageCharacters: body?.messages?.map(message => message.content?.length), tools: body?.tools, tool_choice: body?.tool_choice,
        ...(request.url().endsWith('/v1/chat/completions') ? { body } : {}) });
    }
  });
  context.on('response', response => {
    if (response.url().endsWith('/v1/chat/completions')) {
      const requestId = requestIds.get(response.request());
      const task = response.json().then(body => responses.push({ requestId, at: new Date().toISOString(), status: response.status(), body })).catch(error => responses.push({ requestId, error: String(error) }));
      responseTasks.push(task);
    }
  });
  const fixture = await context.newPage();
  fixture.on('console', message => {
    if (message.text().includes('[ClauseGuard') || message.type() === 'error') {
      logs.push({ at: new Date().toISOString(), type: message.type(), text: message.text() });
      if (message.text().includes('[ClauseGuard activity]')) console.log(message.text());
    }
  });
  fixture.on('pageerror', error => logs.push({ type: 'pageerror', text: String(error) }));
  const popup = await context.newPage();
  popup.on('pageerror', error => logs.push({ type: 'popup-error', text: String(error) }));
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const readLast = () => worker.evaluate(async () => (await chrome.storage.local.get('lastTest')).lastTest);
  for (let attempt = 1; attempt <= ordinaryAttempts + 1; attempt++) {
    const injectedFault = attempt === ordinaryAttempts + 1;
    await fixture.goto(fixtureUrl);
    await fixture.bringToFront();
    await popup.goto(popupUrl);
    await fixture.bringToFront();
    await popup.reload();
    await popup.getByRole('heading', { name: 'ClauseGuard', exact: true }).waitFor();
    // Popup runs in a rendered extension tab for automation, while fixture remains active.
    const currentUrl = await popup.getByTestId('current-url').textContent();
    if (currentUrl !== fixtureUrl) throw new Error(`Popup did not associate active fixture: ${currentUrl}`);
    await popup.getByRole('button', { name: 'Page Agent Testi' }).waitFor({ state: 'visible' });
    const before = await readLast();
    const initialHidden = await fixture.locator('#privacy-policy').evaluate(element => element.hidden);
    if (!initialHidden) throw new Error('Fixture did not start collapsed');
    let injected = false;
    const inject = message => {
      if (injectedFault && !injected && message.text().includes('[ClauseGuard activity]') && message.text().includes('thinking')) {
        injected = true;
        // Fault injection removes a stale DOM target during actual model inference.
        // This never clicks the policy element or supplies a mocked model response.
        void fixture.locator('#open-policy').evaluate(element => element.remove());
      }
    };
    fixture.on('console', inject);
    console.log(`Starting real Page Agent attempt ${attempt}${injectedFault ? ' (stale-element fault injection)' : ''}`);
    const gpuSamples = [];
    let sampling = false;
    const sampleGpu = async () => {
      if (sampling) return;
      sampling = true;
      try {
        gpuSamples.push({ at: new Date().toISOString(),
          gpu: execFileSync('nvidia-smi', ['--query-gpu=memory.used,memory.total,utilization.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8', timeout: 5000 }).trim(),
          processor: execFileSync(resolve('.local/ollama/ollama.exe'), ['ps'], { encoding: 'utf8', timeout: 5000 }).trim(),
          resident: await (await fetch('http://127.0.0.1:11434/api/ps', { signal: AbortSignal.timeout(5000) })).json(),
        });
      } catch (error) { gpuSamples.push({ error: String(error) }); }
      finally { sampling = false; }
    };
    await sampleGpu();
    const gpuInterval = setInterval(() => void sampleGpu(), 750);
    const started = performance.now();
    let result;
    try {
      await popup.getByRole('button', { name: 'Page Agent Testi' }).click();
      while (performance.now() - started < 180_000) {
        result = await readLast();
        if (result?.sessionId && result.sessionId !== before?.sessionId && result.status !== 'RUNNING') break;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    } finally { clearInterval(gpuInterval); }
    fixture.off('console', inject);
    if (!result || result.status === 'RUNNING' || result.sessionId === before?.sessionId) throw new Error('Fixture test timed out or popup start failed');
    const dom = {
      initiallyHidden: initialHidden,
      hiddenAfter: await fixture.locator('#privacy-policy').evaluate(element => element.hidden),
      dataSharingVisible: await fixture.locator('#data-sharing').isVisible(),
      unrelatedClickCount: await fixture.locator('#forbidden-count').textContent(),
      mainWorld: await fixture.evaluate(() => ({ pageAgent: typeof window.PageAgentCore,
        extensionApi: typeof window.chrome?.runtime?.sendMessage,
        customFetch: typeof window.clauseguardFetch })),
    };
    const resident = await (await fetch('http://127.0.0.1:11434/api/ps')).json();
    const loadedGpuSamples = gpuSamples.filter(sample => sample.processor?.includes('qwen3.5:9b-q4_K_M'));
    const gpuEvidence = { samples: gpuSamples,
      fullGpuThroughout: loadedGpuSamples.length > 1 && loadedGpuSamples.every(sample => /100% GPU/.test(sample.processor) && sample.resident.models.some(model => model.name === 'qwen3.5:9b-q4_K_M' && model.context_length === 8192 && model.size > 0 && model.size_vram >= model.size)),
      peakVramMiB: Math.max(0, ...loadedGpuSamples.map(sample => Number(sample.gpu.split(',')[0]))),
      peakUtilization: Math.max(0, ...loadedGpuSamples.map(sample => Number(sample.gpu.split(',')[2]))),
    };
    const item = { attempt, injectedFault, injected, result, dom, resident, gpuEvidence,
      nvidiaSmi: execFileSync('nvidia-smi', { encoding: 'utf8' }),
      ollamaPs: execFileSync(resolve('.local/ollama/ollama.exe'), ['ps'], { encoding: 'utf8' }) };
    attempts.push(item); save(`page-agent-attempt-${attempt}.json`, item);
    await fixture.screenshot({ path: join(evidence, `fixture-after-${attempt}.png`), fullPage: true });
    await popup.screenshot({ path: join(evidence, `popup-after-${attempt}.png`), fullPage: true });
    console.log(JSON.stringify({ attempt, injectedFault, status: result.status, data: result.data,
      durationMs: result.durationMs, calls: result.toolCalls, failed: result.failedToolCalls, retries: result.retries, dom }, null, 2));
    if (!injectedFault && (result.status !== 'PASS' || dom.hiddenAfter || !dom.dataSharingVisible || dom.unrelatedClickCount !== '0')) {
      functionalFailures.push(`Real functional attempt ${attempt} failed: ${result.data}`);
    }
    if (!gpuEvidence.fullGpuThroughout || gpuEvidence.peakUtilization === 0) functionalFailures.push(`Attempt ${attempt} lacks independently sampled full GPU inference evidence`);
    if (injectedFault && (result.status !== 'FAIL' || !dom.hiddenAfter || result.failedToolCalls < 1 || !injected)) functionalFailures.push('Fault injection did not demonstrate safe failed DOM interaction');
  }
  const beforeInjection = await readLast();
  await fixture.evaluate(() => window.postMessage({ type: 'START_TEST', channel: 'clauseguard', url: 'https://example.com' }, location.origin));
  await new Promise(resolve => setTimeout(resolve, 300));
  const afterInjection = await readLast();
  if (beforeInjection.sessionId !== afterInjection.sessionId) throw new Error('Page-side message unexpectedly started a privileged session');
  // Exercise the real boundary from the injected content-script context, not
  // a Service Worker sending a message to itself (Chrome has no receiver there).
  const cdp = await context.newCDPSession(fixture);
  const executionContexts = [];
  cdp.on('Runtime.executionContextCreated', event => executionContexts.push(event.context));
  await cdp.send('Runtime.enable');
  const isolated = executionContexts.find(item => item.origin === `chrome-extension://${extensionId}` || item.name === extensionId);
  if (!isolated) { save('execution-contexts.json', executionContexts); throw new Error('Cannot locate actual isolated extension execution context for security test'); }
  const rejection = await cdp.send('Runtime.evaluate', { contextId: isolated.id, awaitPromise: true, returnByValue: true,
    expression: '(async () => { try { await chrome.runtime.sendMessage({type:"START_TEST"}); return "unexpected acceptance"; } catch(error) { return String(error); } })()' });
  const unauthorized = rejection.result.value;
  if (typeof unauthorized !== 'string' || !unauthorized.includes('Only the extension popup')) throw new Error(`Unauthorized content-script sender not rejected by actual handler: ${unauthorized}`);
  await cdp.detach();
  save('browser-security.json', { pageSideMessageIgnored: true, unauthorizedSenderRejected: unauthorized,
    mainWorldIsolated: attempts.every(item => item.dom.mainWorld.pageAgent === 'undefined' && item.dom.mainWorld.extensionApi === 'undefined' && item.dom.mainWorld.customFetch === 'undefined'),
    noUnrelatedClick: attempts.every(item => item.dom.unrelatedClickCount === '0'),
    allowedTools: attempts.map(item => item.result.allowedTools),
    allModelRequestsFromServiceWorker: network.filter(item => item.url.endsWith('/v1/chat/completions')).every(item => item.serviceWorker?.endsWith('/background.js')) });
  save('browser-environment.json', { measuredAt, browserVersion, executablePath, extensionId, workerUrl: worker.url(), headless: true, isolatedProfile });
} catch (error) { failure = String(error); console.error(failure); }
finally {
  await Promise.allSettled(responseTasks);
  save('page-agent-responses.json', responses);
  save('browser-integration.json', { measuredAt, status: failure ? 'FAIL' : functionalFailures.length ? 'DEGRADED' : 'PASS', failure, functionalFailures, attempts,
    ordinarySuccessRate: attempts.filter(item => !item.injectedFault && item.result.status === 'PASS').length / ordinaryAttempts,
    note: 'Fault-injection failure is expected and excluded from ordinary task success rate. No policy button is manually clicked.' });
  save('page-agent-network.json', network); save('browser-console.json', logs);
  await context?.close();
  server?.close();
}
if (failure || functionalFailures.length) process.exitCode = 1;
