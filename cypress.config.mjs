import { defineConfig } from 'cypress';
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadRisk } from './scripts/load-risk.mjs';
let port, browser, context, extensionId, started;
const events = [], network = [];
const directory = 'docs/evidence/final/demo';
const save = () => { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(directory + '/events.json', JSON.stringify({ started, events, network }, null, 2)); };
async function connect() {
  if (context) return context;
  browser = await chromium.connectOverCDP('http://127.0.0.1:' + port); context = browser.contexts()[0];
  const worker = context.serviceWorkers().find(w => w.url().endsWith('/background.js')) ?? await context.waitForEvent('serviceworker', { timeout: 10_000, predicate: w => w.url().endsWith('/background.js') });
  extensionId = new URL(worker.url()).host;
  context.on('request', r => { if (r.url().startsWith('http://127.0.0.1:11434/')) { network.push({ at: Date.now(), url: r.url(), body: r.postDataJSON(), worker: r.serviceWorker()?.url() }); save(); } });
  return context;
}
async function frames() {
  await connect();
  const all = context.pages().flatMap(p => p.frames());
  const ui = all.find(f => f.url() === `chrome-extension://${extensionId}/demo.html`);
  const source = all.find(f => /^http:\/\/127\.0\.0\.1:4173\/demo\/(?:flow|incomplete-flow)\.html$/.test(f.url()));
  if (!ui || !source) throw Error('Actual extension UI/source frame missing');
  return { ui, source };
}
const snapshot = async key => (await frames()).ui.evaluate(async key => (await chrome.storage.session.get(key))[key], key);
async function wait(read, predicate, deadline = 150_000) {
  const before = performance.now();
  while (performance.now() - before < deadline) { const r = await read(); if (predicate(r)) return r; await new Promise(done => setTimeout(done, 150)); }
  throw Error('Actual application did not complete within demo deadline');
}
function mark(name, detail = {}) { events.push({ name, at: Date.now(), relativeMs: Date.now() - started, ...detail }); save(); }

export default defineConfig({ video: true, videoCompression: 20, viewportWidth: 1440, viewportHeight: 900,
  videosFolder: 'demo/raw', screenshotsFolder: 'demo/screenshots', screenshotOnRunFailure: true,
  taskTimeout: 180_000, defaultCommandTimeout: 10_000,
  e2e: { baseUrl: 'http://127.0.0.1:4173', supportFile: false, specPattern: 'cypress/demo.cy.mjs',
    setupNodeEvents(on) {
      on('before:browser:launch', (_b, launch) => {
        launch.extensions.push(resolve('.output/chrome-mv3'));
        launch.args = launch.args.filter(a => a !== '--disable-extensions' && !a.startsWith('--window-size='));
        launch.args.push('--load-extension=' + launch.extensions.join(','), '--window-size=1820,1080');
        port = Number(launch.args.find(a => a.startsWith('--remote-debugging-port='))?.split('=')[1]); return launch;
      });
      on('before:spec', () => { started = Date.now(); events.length = 0; network.length = 0; save(); });
      on('task', {
        async 'demo:extension'() { await connect(); return extensionId; },
        async 'demo:ready'() { const { ui } = await frames(); await ui.getByRole('button', { name: 'Belgeyi Tara', exact: true }).waitFor(); mark('ready'); return true; },
        async 'demo:scan'() {
          const { ui, source } = await frames(); const before = (await snapshot('lastScan'))?.sessionId; mark('scan-start', { source: source.url() });
          await ui.getByRole('button', { name: 'Belgeyi Tara', exact: true }).evaluate(button => button.click());
          const scan = await wait(() => snapshot('lastScan'), r => r?.sessionId !== before && ['READY', 'PARTIAL', 'FAILED', 'INSUFFICIENT'].includes(r?.state));
          assert(['READY', 'PARTIAL'].includes(scan.state));
          if (source.url().endsWith('/flow.html')) {
            assert.equal(scan.path, 'SLOW'); assert(scan.discovery.success);
            assert(scan.discovery.activities.some(a => a.type === 'executed' && a.tool === 'click_element_by_index' && String(a.output).includes('Clicked')));
            assert(await source.locator('#agreement').isVisible());
          }
          mark('scan-end', { scan }); return { state: scan.state, path: scan.path, agentSuccess: scan.discovery?.success ?? null };
        },
        async 'demo:analyze'() {
          const { ui, source } = await frames(); const before = (await snapshot('lastAnalysis'))?.jobId; mark('analysis-start', { source: source.url() });
          await ui.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).evaluate(button => button.click());
          const envelope = await wait(() => snapshot('lastAnalysis'), r => r?.jobId !== before && ['FINISHED', 'FAILED'].includes(r?.status));
          const risk = await loadRisk(); const report = risk.riskReportSchema.parse(envelope.report);
          const scan = await snapshot('lastScan');
          for (const f of report.findings) {
            const c = scan.documents[0].sourceChunks.find(c => c.chunkId === f.sourceChunkId); assert.equal(c.text.slice(f.evidence.start, f.evidence.end), f.quote);
          }
          if (source.url().endsWith('/flow.html')) { assert(report.findings.some(f => f.category === 'AUTOMATIC_RENEWAL')); assert.equal(report.status, 'COMPLETE'); assert.equal(report.score, risk.calculateScore(report.findings).score); }
          else { assert.equal(report.coverage.extractionStatus, 'UNKNOWN'); assert.equal(report.score, null); }
          mark('analysis-end', { envelope }); return { score: report.score, status: report.status, findings: report.findings.length };
        },
        async 'demo:report'() {
          const { ui, source } = await frames(); await ui.getByRole('button', { name: 'Ayrıntılı Raporu Aç', exact: true }).evaluate(button => button.click());
          await ui.getByRole('heading', { name: 'Risk raporu', exact: true }).waitFor();
          assert(await ui.getByText('Bu uygulama hukuki tavsiye vermez.', { exact: true }).count() > 0);
          await source.evaluate(() => document.body.classList.add('report-view'));
          await ui.page().screenshot({ path: directory + '/report-' + events.filter(e => e.name === 'report').length + '.png' });
          mark('report'); return true;
        },
        async 'demo:quote'() { const { ui } = await frames(); await ui.locator('.finding blockquote').first().scrollIntoViewIfNeeded(); const quote = await ui.locator('.finding blockquote').first().textContent(); assert(quote.length > 20); mark('verified-quote-visible', { quote }); return quote; },
        async 'demo:disclaimer'() { const { ui } = await frames(); await ui.getByText('Bu uygulama hukuki tavsiye vermez.', { exact: true }).scrollIntoViewIfNeeded(); mark('disclaimer-visible'); return true; },
        async 'demo:uncertainty'() {
          const { ui } = await frames(); const text = await ui.getByTestId('risk-score').textContent();
          assert.equal(text, 'Güvenilir risk puanı hesaplanamadı.'); assert.equal(await ui.locator('.score-number').count(), 0);
          assert((await snapshot('lastAnalysis')).report.score === null);
          mark('uncertainty-visible', { displayedScore: text }); return true;
        },
      });
      on('after:run', r => { save(); fs.writeFileSync(directory + '/cypress-results.json', JSON.stringify({ at: new Date().toISOString(), totalPassed: r.totalPassed, totalFailed: r.totalFailed, runs: r.runs.map(run => ({ spec: run.spec, video: run.video, stats: run.stats })) }, null, 2)); });
    } },
});
