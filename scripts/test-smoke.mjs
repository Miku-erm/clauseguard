import { chromium } from 'playwright-core';
import { browserExecutable } from './lib/browser.mjs';
import { startFixture } from './serve-fixture.mjs';
import { loadRisk } from './load-risk.mjs';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const dir = 'docs/evidence/final/smoke'; mkdirSync(dir, { recursive: true });
const results = [], network = []; let context, server, worker, fixture, popup;
const save = () => writeFileSync(dir + '/results.json', JSON.stringify({ at: new Date().toISOString(), results, network }, null, 2));
const record = (name, detail = {}) => { results.push({ name, pass: true, ...detail }); save(); console.log('PASS: ' + name); };
const risk = await loadRisk();
async function until(read, predicate, limit = 120_000) {
  const start = performance.now();
  while (performance.now() - start < limit) { const value = await read(); if (predicate(value)) return value; await new Promise(r => setTimeout(r, 150)); }
  throw Error('Timed out waiting for actual extension completion');
}
const state = key => worker.evaluate(async key => (await chrome.storage.session.get(key))[key], key);
async function scan(name) {
  await fixture.goto('http://127.0.0.1:4173/' + name); await fixture.bringToFront(); await popup.reload();
  await popup.getByTestId('current-url').filter({ hasText: name }).waitFor();
  const before = (await state('lastScan'))?.sessionId;
  await popup.getByRole('button', { name: 'Belgeyi Tara', exact: true }).click();
  return until(() => state('lastScan'), r => r?.sessionId !== before && ['READY', 'PARTIAL', 'INSUFFICIENT', 'FAILED'].includes(r?.state), 180_000);
}
async function analyze() {
  const before = (await state('lastAnalysis'))?.jobId;
  await popup.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).click();
  return until(() => state('lastAnalysis'), r => r?.jobId !== before && ['FINISHED', 'FAILED'].includes(r?.status));
}
try {
  const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { shell: process.platform === 'win32', stdio: 'inherit' });
  assert.equal(build.status, 0); record('WXT build');
  server = startFixture(); await once(server, 'listening');
  context = await chromium.launchPersistentContext(resolve('.local/final-smoke-' + randomUUID()), { executablePath: browserExecutable(), channel: 'chromium', headless: true,
    args: ['--load-extension=' + resolve('.output/chrome-mv3'), '--disable-extensions-except=' + resolve('.output/chrome-mv3'), '--disable-gpu', '--disable-background-networking'] });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const root = 'chrome-extension://' + new URL(worker.url()).host;
  context.on('request', r => { if (r.url().startsWith('http://127.0.0.1:11434')) network.push({ url: r.url(), body: r.postDataJSON(), worker: r.serviceWorker()?.url() }); });
  fixture = await context.newPage(); popup = await context.newPage(); await popup.goto(root + '/popup.html');
  const landing = await scan('demo/llms-landing.html');
  assert.equal(landing.llmsTxt.status, 'FOUND'); assert(landing.llmsTxt.links.some(l => l.url.endsWith('/demo/risk.html')));
  await popup.getByRole('button', { name: 'Subscription Terms', exact: true }).click();
  await fixture.waitForURL('**/demo/risk.html'); record('llms.txt used for authorized document navigation', { discovery: landing.llmsTxt });
  const inferenceCount = () => network.filter(r => ['/api/chat', '/api/generate', '/v1/chat/completions'].some(path => r.url.endsWith(path))).length;
  const before = inferenceCount(); const fast = await scan('demo/risk.html');
  assert.equal(fast.path, 'FAST'); assert.equal(fast.providerCalls, 0); assert.equal(inferenceCount(), before); record('FAST extraction has zero inference', { scan: fast });
  const result = await analyze(); const report = risk.riskReportSchema.parse(result.report);
  assert(report.findings.some(f => f.category === 'AUTOMATIC_RENEWAL')); assert.equal(report.score, risk.calculateScore(report.findings).score);
  assert.equal(report.status, 'COMPLETE');
  for (const f of report.findings) {
    const c = fast.documents[0].sourceChunks.find(c => c.chunkId === f.sourceChunkId); assert.equal(c.text.slice(f.evidence.start, f.evidence.end), f.quote);
  }
  record('Real Qwen / schema / original quotation / deterministic score', { result });
  const reportEvent = context.waitForEvent('page'); await popup.getByRole('button', { name: 'Ayrıntılı Raporu Aç' }).click(); const page = await reportEvent;
  await page.getByRole('heading', { name: 'Risk raporu', exact: true }).waitFor();
  assert(await page.getByText('Bu uygulama hukuki tavsiye vermez.', { exact: true }).isVisible());
  await page.screenshot({ path: dir + '/real-report.png', fullPage: true });
  await page.getByRole('button', { name: 'Kaynağa Git', exact: true }).first().click();
  await until(() => fixture.evaluate(() => document.querySelectorAll('[data-clauseguard-highlight]').length || (CSS.highlights?.has('clauseguard-source') ? 1 : 0)), n => n > 0, 5000);
  record('Source navigation / highlight / legal disclaimer'); await page.close();
  const slow = await scan('demo/expandable.html');
  const opened = await fixture.locator('#agreement').isVisible();
  assert(opened); assert.equal(slow.path, 'SLOW'); assert(slow.discovery.activities.some(a => a.type === 'executed' && a.tool === 'click_element_by_index' && String(a.output).includes('Clicked')));
  record('Actual Alibaba tool opened hidden agreement', { scan: slow, agentCompleted: slow.discovery.success });
  const negative = await scan('demo/negative.html'); assert.equal(negative.path, 'FAST');
  const denial = await analyze(); assert(!denial.report.findings.some(f => f.category === 'AUTOMATIC_RENEWAL'));
  record('Negative renewal does not become an affirmative finding', { result: denial });
  await scan('demo/incomplete.html'); const partial = await analyze();
  assert.equal(partial.report.coverage.extractionStatus, 'UNKNOWN'); assert.equal(partial.report.score, null);
  assert(await popup.getByTestId('risk-score').isVisible());
  await popup.screenshot({ path: dir + '/uncertainty.png', fullPage: true }); record('Incomplete coverage withholds complete-document score', { result: partial });
  record('Independent GPU snapshot', { nvidia: execFileSync('nvidia-smi', ['--query-gpu=name,memory.used,utilization.gpu', '--format=csv,noheader'], { encoding: 'utf8' }).trim() });
} catch (error) { results.push({ name: 'failure', pass: false, error: String(error) }); save(); process.exitCode = 1; console.error(error); }
finally { await context?.close(); if (server) { server.closeAllConnections(); await new Promise(done => server.close(done)); } }
