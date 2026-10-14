import { browserExecutable } from './lib/browser.mjs';
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';
const dir = '.local/p4/real'; mkdirSync(dir, { recursive: true });
const sources = JSON.parse(readFileSync('evaluation/sources.json', 'utf8'));
const executable = browserExecutable();
const extension = resolve('.output/chrome-mv3');
const context = await chromium.launchPersistentContext(resolve(`.local/p4-real-${randomUUID()}`), { executablePath: executable, channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking', '--disable-component-update'] });
const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const id = new URL(worker.url()).host;
const cdp = await context.browser().newBrowserCDPSession();
const popup = await context.newPage(); await popup.goto(`chrome-extension://${id}/popup.html`);
for (const s of sources) {
  if (existsSync(`${dir}/${s.id}.json`)) continue;
  const page = await context.newPage();
  try {
    const response = await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => document.body.innerText.length > 10000, { timeout: 12000 }).catch(() => {});
    const html = await page.content(); const text = await page.locator('body').innerText();
    writeFileSync(`${dir}/${s.id}.html`, html); writeFileSync(`${dir}/${s.id}-body.txt`, text);
    const headings = await page.locator('h1,h2,h3').allTextContents();
    if (!response?.ok() || text.length < 1000) throw new Error(`Insufficient official response HTTP ${response?.status()} text ${text.length}`);
    // Reject a combined regional agreement rather than silently mixing branches.
    if (s.id === 'reddit' && /European Economic Area/.test(text) && /United States/.test(text)) throw new Error('Regional branch isolation required; raw capture retained privately');
    await page.bringToFront();
    const targets = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }, { exclude: true }] });
    const target = targets.targetInfos.find(t => t.url === page.url()); if (!target) throw new Error('No real tab target');
    await cdp.send('Extensions.triggerAction', { id, targetId: target.targetId }); await popup.reload();
    await popup.getByTestId('current-url').filter({ hasText: page.url() }).waitFor();
    const before = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan?.sessionId);
    await popup.getByRole('button', { name: 'Belgeyi Tara', exact: true }).click();
    let scan; const start = performance.now();
    while (performance.now() - start < 25000) {
      scan = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan);
      if (scan?.sessionId !== before && ['READY','PARTIAL','FAILED','INSUFFICIENT'].includes(scan?.state)) break;
      await new Promise(r => setTimeout(r, 100));
    }
    if (!scan?.documents?.length || scan.agentInvoked || scan.providerCalls) throw new Error(`Read-only scan failed: ${scan?.state}`);
    writeFileSync(`${dir}/${s.id}.json`, JSON.stringify(scan.documents[0], null, 2));
    Object.assign(s, { status: 'EXTRACTED', accessedAt: new Date().toISOString(), finalUrl: page.url(), title: await page.title(), snapshotSha256: createHash('sha256').update(html).digest('hex'), privateSnapshot: `${dir}/${s.id}.html`, extractionMethod: 'Actual MV3 extension, activeTab user-action grant, ISOLATED read-only FAST path',
      documentId: scan.documents[0].documentId, documentHash: scan.documents[0].contentHash, documentType: scan.documents[0].documentType, characters: scan.documents[0].extraction.extractedCharacterCount, chunks: scan.documents[0].sourceChunks.length, extractionCoverage: scan.documents[0].extraction.status });
    delete s.error;
    console.log(JSON.stringify({ id: s.id, status: s.status, characters: s.characters, chunks: s.chunks, coverage: s.extractionCoverage }));
  } catch (error) { Object.assign(s, { status: 'BLOCKED', error: String(error) }); console.log(JSON.stringify({ id: s.id, status: s.status, error: s.error })); }
  await page.close();
}
await context.close(); writeFileSync('evaluation/sources.json', JSON.stringify(sources, null, 2));
