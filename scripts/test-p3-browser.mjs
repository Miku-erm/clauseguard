import { browserExecutable } from './lib/browser.mjs';
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { startFixture } from './serve-fixture.mjs';
import { loadRisk } from './load-risk.mjs';
const { calculateScore } = await loadRisk();
const directory = process.env.CLAUSEGUARD_P3_EVIDENCE_DIR ?? 'docs/evidence/p3-browser'; mkdirSync(directory, { recursive: true });
const save = (name, data) => writeFileSync(`${directory}/${name}`, JSON.stringify(data, null, 2));
const results = []; const network = []; const errors = []; const semanticFailures = []; let context; let server; let popup; let fixture; let worker; let failure;
const record = (name, detail) => { results.push({ name, status: 'PASS', ...detail }); console.log(JSON.stringify(results.at(-1))); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const readAnalysis = () => popup.evaluate(async () => (await chrome.storage.session.get('lastAnalysis')).lastAnalysis);
async function scan(name) {
  await fixture.goto(`http://127.0.0.1:4173/${name}`); await fixture.bringToFront(); await popup.reload();
  await popup.getByTestId('current-url').filter({ hasText: `http://127.0.0.1:4173/${name}` }).waitFor();
  const before = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan?.sessionId);
  await popup.getByRole('button', { name: 'Belgeyi Tara', exact: true }).click();
  const started = performance.now(); let terminal;
  while (performance.now() - started < 180_000) {
    terminal = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan);
    if (terminal?.sessionId !== before && ['READY', 'PARTIAL', 'FAILED', 'INSUFFICIENT'].includes(terminal?.state)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(terminal?.sessionId !== before && ['READY', 'PARTIAL', 'FAILED', 'INSUFFICIENT'].includes(terminal?.state), 'Scan did not reach a terminal state');
}
async function finish() {
  const started = performance.now();
  while (performance.now() - started < 120_000) {
    const result = await readAnalysis();
    if (result && ['FINISHED', 'FAILED', 'INTERRUPTED'].includes(result.status)) return result;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Analysis did not reach a terminal state');
}
async function reportPage() {
  const next = context.waitForEvent('page'); await popup.getByRole('button', { name: 'Ayrıntılı Raporu Aç' }).click(); const page = await next;
  await page.getByRole('heading', { name: 'Risk raporu', exact: true }).waitFor(); await page.getByTestId('risk-score').waitFor(); return page;
}
try {
  try { const response = await fetch('http://127.0.0.1:4173/p2/renewal.html', { signal: AbortSignal.timeout(1000) }); assert(response.ok, 'Existing fixture server lacks required routes'); }
  catch { server = startFixture(); await once(server, 'listening'); }
  const executable = browserExecutable();
  const extension = resolve('.output/chrome-mv3'); context = await chromium.launchPersistentContext(resolve(`.local/p3-browser-${randomUUID()}`), { executablePath: executable, channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking', '--disable-component-update'] });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const id = new URL(worker.url()).host; const root = `chrome-extension://${id}`;
  context.on('request', request => { if (request.url().startsWith('http://127.0.0.1:11434')) network.push({ at: new Date().toISOString(), url: request.url(), body: request.postDataJSON(), worker: request.serviceWorker()?.url() }); });
  context.on('page', page => page.on('pageerror', error => errors.push(String(error))));
  fixture = await context.newPage(); popup = await context.newPage(); await popup.goto(`${root}/popup.html`);
  await scan('p2/renewal.html'); const modelStart = network.filter(r => r.url.endsWith('/api/chat')).length;
  await popup.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).click();
  await popup.waitForFunction(() => chrome.storage.session.get('lastAnalysis').then(s => s.lastAnalysis?.status === 'RUNNING'));
  const running = await readAnalysis(); await popup.close(); await fixture.bringToFront();
  popup = await context.newPage(); await fixture.bringToFront(); await popup.goto(`${root}/popup.html`);
  const restored = await readAnalysis(); assert(restored.jobId === running.jobId, 'Popup reopen duplicated or lost running job');
  const final = await finish(); save('renewal-final.json', final);
  // Retain the original expectation and nonzero suite outcome; permit later UI checks
  // only when actual complete, source-verified renewal evidence exists.
  // P4.1 adjudication v1: source has TWO independent disadvantages. Historical
  // score-14 assertion preserved in docs/evidence/p4.1/baseline/.
  // Model severity remains variable; UI score must equal unchanged deterministic math.
  try { assert(final.report?.status === 'COMPLETE' &&
    ['AUTOMATIC_RENEWAL', 'DIFFICULT_CANCELLATION_OR_REFUND'].every(category => final.report.findings.some(f => f.category === category)) &&
    final.report.findings.every(f => ['AUTOMATIC_RENEWAL', 'DIFFICULT_CANCELLATION_OR_REFUND'].includes(f.category)) &&
    final.report.score === calculateScore(final.report.findings).score, 'Adjudicated two-category renewal analysis failed'); }
  catch (error) { semanticFailures.push(String(error)); }
  assert(final.report?.status === 'COMPLETE' && final.report.findings.some(finding => finding.category === 'AUTOMATIC_RENEWAL'), 'No complete verified renewal evidence for UI regression');
  assert(network.filter(r => r.url.endsWith('/api/chat')).length === modelStart + 1, 'Popup reopening started duplicate model request');
  await popup.getByRole('button', { name: 'Ayrıntılı Raporu Aç' }).waitFor();
  await popup.setViewportSize({ width: 390, height: 600 });
  assert(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Popup horizontal overflow');
  await popup.screenshot({ path: `${directory}/popup-complete.png`, fullPage: true }); record('real-model-popup-close-reopen', { jobId: final.jobId, score: final.report.score });
  let report = await reportPage(); assert(new URL(report.url()).searchParams.size === 1 && new URL(report.url()).searchParams.get('id') === final.jobId, 'Report URL leaks content or wrong ID');
  assert(await report.locator('blockquote').first().textContent() === final.report.findings[0].quote, 'Report original quotation differs');
  await report.screenshot({ path: `${directory}/report-complete.png`, fullPage: true });
  await report.getByRole('button', { name: 'Kaynağa Git' }).first().click();
  await fixture.waitForFunction(() => !!document.querySelector('[data-clauseguard-highlighted=true]'));
  const highlight = await fixture.evaluate(() => ({ quote: [...CSS.highlights.get('clauseguard-source')][0].toString(), marked: document.querySelector('[data-clauseguard-highlighted=true]').textContent }));
  assert(highlight.quote === final.report.findings[0].quote, 'Highlighted range is not exact verified quote');
  await fixture.screenshot({ path: `${directory}/source-highlight.png`, fullPage: true }); record('source-navigation-exact-highlight', highlight);
  await fixture.locator('#clause-1').evaluate(element => { element.textContent += ' Changed after extraction.'; });
  await report.getByRole('button', { name: 'Kaynağa Git' }).first().click(); await report.getByTestId('source-message').filter({ hasText: 'değişmiş' }).waitFor(); record('source-hash-change-rejected', {});
  const other = await context.newPage(); await other.goto('http://127.0.0.1:4173/p2/safe.html'); await other.bringToFront(); await popup.reload();
  await popup.getByTestId('current-url').filter({ hasText: '/safe.html' }).waitFor(); assert(await popup.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).isDisabled(), 'Old report attached to another tab'); assert(!await popup.getByRole('button', { name: 'Ayrıntılı Raporu Aç' }).count(), 'Old report exposed on different tab'); record('cross-tab-isolation', {}); await other.close();
  await fixture.close(); await report.getByRole('button', { name: 'Kaynağa Git' }).first().click(); await report.getByTestId('source-message').filter({ hasText: 'kapatılmış' }).waitFor(); record('closed-source-tab', {}); await report.close();
  fixture = await context.newPage(); await scan('p2/safe.html'); await popup.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).click(); const safe = await finish(); assert(safe.report.score === 0, 'Safe document did not score zero');
  await popup.getByText('İncelenen metinde doğrulanmış riskli madde tespit edilmedi.').waitFor(); record('real-model-safe-zero-wording', {});
  await scan('p1/unknown.html'); await popup.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).click(); const unknown = await finish(); assert(unknown.report.score === null, 'Unknown source received a score');
  await popup.getByText('Güvenilir risk puanı hesaplanamadı.').waitFor(); report = await reportPage(); await report.getByText('Güvenilir risk puanı hesaplanamadı.').waitFor(); await report.screenshot({ path: `${directory}/report-unknown.png`, fullPage: true }); record('real-model-unknown-withheld', {}); await report.close();
  await scan('p2/injection.html'); await popup.getByRole('button', { name: 'Risk Analizi Yap', exact: true }).click(); const injection = await finish();
  // Keep the gold assertion and nonzero outcome; continue UI verification after a semantic failure.
  try { assert(injection.report.findings.some(finding => finding.category === 'AUTOMATIC_RENEWAL'), 'Injection hid the source-backed renewal finding'); }
  catch (error) { semanticFailures.push(String(error)); }
  if (injection.report.rejectedFindingCount) {
    assert(injection.report.score === null, 'Rejected findings produced an eligible score');
    await popup.getByText(/desteklenmeyen bulgu dışlandı/).waitFor();
  }
  report = await reportPage(); await report.screenshot({ path: `${directory}/report-injection.png`, fullPage: true });
  record('real-model-injection-presentation', { status: injection.report.status, score: injection.report.score, rejected: injection.report.rejectedFindingCount, accepted: injection.report.findings.length }); await report.close();
  // Long-display test replays the preserved real P2 response, with freshly scanned source and explicit provenance.
  await scan('p2/long.html'); const replay = JSON.parse(readFileSync('docs/evidence/p2-model-current/long.json', 'utf8')).report; const replayJob = randomUUID();
  await popup.evaluate(async ({ replay, replayJob }) => { const stored = await chrome.storage.session.get(['uiSession', 'lastScan']); if (stored.lastScan.documents[0].contentHash !== replay.documentHash) throw new Error('Replay source version differs'); await chrome.storage.session.set({ uiSession: { ...stored.uiSession, jobId: replayJob }, lastAnalysis: { jobId: replayJob, status: 'FINISHED', report: replay } }); }, { replay, replayJob });
  report = await reportPage(); assert(await report.locator('blockquote').count() === replay.findings.length, 'Long report omitted findings');
  await report.setViewportSize({ width: 440, height: 850 }); assert(await report.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile report horizontal overflow'); await report.screenshot({ path: `${directory}/report-mobile-long-replay.png`, fullPage: true }); record('long-report-display-replay', { provenance: 'Preserved real P2 report; not fresh P3 inference', chunks: replay.coverage.totalChunks }); await report.close();
  await popup.getByRole('button', { name: 'Ayarları aç' }).click(); const settings = context.pages().find(page => page.url().endsWith('/settings.html')) ?? await context.waitForEvent('page');
  await settings.getByRole('heading', { name: 'Ayarlar', exact: true }).waitFor(); await settings.getByText('GPU durumu bu ekrandan doğrulanamadı.').waitFor(); await settings.screenshot({ path: `${directory}/settings.png`, fullPage: true }); record('settings-honest-gpu', {});
  await settings.getByRole('button', { name: 'Yerel Verileri Temizle' }).click(); await settings.getByRole('button', { name: 'Evet, temizle' }).click(); await settings.getByText('Yerel tarama, rapor ve tanılama oturum verileri temizlendi.').waitFor();
  assert(!(await settings.evaluate(async () => (await chrome.storage.session.get(null)).lastAnalysis)), 'Clear retained report'); record('clear-session-data', {});
  const unsupported = await context.newPage(); await unsupported.goto('chrome://version'); await unsupported.bringToFront(); await popup.reload(); await popup.getByRole('button', { name: 'Belgeyi Tara' }).waitFor(); assert(await popup.getByRole('button', { name: 'Belgeyi Tara' }).isDisabled(), 'Restricted page scan enabled'); record('unsupported-page-disabled', {}); await unsupported.close();
  await fixture.bringToFront(); await popup.reload(); await popup.keyboard.press('Tab'); assert(await popup.evaluate(() => document.activeElement !== document.body), 'Keyboard focus unavailable');
  save('environment.json', { browserVersion: context.browser().version(), executable, extensionId: id, brandedChrome: 'BLOCKED: not installed in checked standard locations or native app inventory', popupMode: 'Real rendered extension popup document; close/reopen, not native toolbar' });
  save('gpu-final.json', { processor: execFileSync(resolve('.local/ollama/ollama.exe'), ['ps'], { encoding: 'utf8' }), gpu: execFileSync('nvidia-smi', ['--query-gpu=name,memory.used,memory.total,utilization.gpu', '--format=csv'], { encoding: 'utf8' }) });
  assert(network.filter(r => r.url.endsWith('/api/chat')).every(r => r.worker?.endsWith('/background.js') && !r.body.tools && r.body.options.num_ctx === 8192), 'Risk transport changed');
  assert(!errors.length, `UI page errors: ${errors.join('; ')}`);
  assert(!semanticFailures.length, `Real model semantic failures: ${semanticFailures.join('; ')}`);
} catch (error) { failure = String(error); console.error(failure); }
finally { save('integration.json', { measuredAt: new Date().toISOString(), status: failure ? 'FAIL' : 'PASS', failure, results, pageErrors: errors, semanticFailures }); save('network.json', network); await context?.close(); server?.close(); }
if (failure) process.exitCode = 1;
