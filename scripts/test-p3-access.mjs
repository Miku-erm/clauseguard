import { browserExecutable } from './lib/browser.mjs';
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const directory = process.env.CLAUSEGUARD_P3_ACCESS_DIR ?? 'docs/evidence/p3-access'; mkdirSync(directory, { recursive: true });
const mode = process.argv[2] ?? 'access'; const results = []; let context; let failure;
const save = (name, data) => writeFileSync(`${directory}/${name}`, JSON.stringify(data, null, 2));
try {
  const executable = browserExecutable();
  const extension = resolve('.output/chrome-mv3'); context = await chromium.launchPersistentContext(resolve(`.local/p3-access-${randomUUID()}`), { executablePath: executable, channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-gpu', '--disable-background-networking', '--disable-component-update'] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const id = new URL(worker.url()).host;
  const settings = await context.newPage(); await settings.goto(`chrome-extension://${id}/settings.html`);
  if (mode !== 'access') {
    await settings.getByRole('button', { name: 'Bağlantıyı Sına' }).click();
    const expected = mode === 'offline' ? 'Ollama bağlantısı kurulamadı' : 'Ollama bağlı · Qwen modeli kurulu';
    await settings.getByText(expected, { exact: true }).waitFor(); await settings.screenshot({ path: `${directory}/settings-${mode}.png`, fullPage: true });
    const resident = mode === 'unloaded' ? await (await fetch('http://127.0.0.1:11434/api/ps')).json() : undefined;
    if (mode === 'unloaded' && resident.models.length) throw new Error('Unloaded test requires genuinely empty resident list');
    if (mode === 'offline') { let offline = false; try { await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) }); } catch { offline = true; } if (!offline) throw new Error('Ollama still reachable; offline evidence invalid'); }
    results.push({ name: mode, status: 'PASS', resident, expected, transportMocked: false });
  } else {
    // One public policy, read-only; not the final multi-site/gold-label evaluation.
    const page = await context.newPage(); const url = process.env.CLAUSEGUARD_PUBLIC_URL ?? 'https://www.mozilla.org/en-US/privacy/websites/'; await page.goto(url); await page.bringToFront();
    const popup = await context.newPage(); await page.bringToFront(); await popup.goto(`chrome-extension://${id}/popup.html`);
    // No toolbar grant exists simply because the popup document was opened as a tab.
    const denied = await worker.evaluate(async ({ tabUrl }) => { const tabs = await chrome.tabs.query({}); const tab = tabs.find(t => t.url === tabUrl); return tab ? { hasTabUrl: true } : { hasTabUrl: false }; }, { tabUrl: url });
    results.push({ name: 'before-toolbar-grant', status: 'OBSERVED', ...denied });
    const cdp = await context.browser().newBrowserCDPSession();
    const targets = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }, { exclude: true }] });
    save('tab-targets.json', targets); const candidates = targets.targetInfos.filter(target => target.url === url);
    try {
      if (candidates.length !== 1) throw new Error('CDP did not uniquely expose the public tab target');
      await cdp.send('Extensions.triggerAction', { id, targetId: candidates[0].targetId });
      const opened = await context.waitForEvent('page', { timeout: 5000 }).catch(() => context.pages().find(p => p !== popup && p.url() === `chrome-extension://${id}/popup.html`));
      // Use the existing popup tab to send an explicit scan; the action invocation itself grants activeTab.
      await popup.reload(); await popup.getByTestId('current-url').filter({ hasText: url }).waitFor();
      await popup.getByRole('button', { name: 'Belgeyi Tara', exact: true }).click();
      let result; const started = performance.now();
      while (performance.now() - started < 20_000) { result = await popup.evaluate(async () => (await chrome.storage.session.get('lastScan')).lastScan); if (result && ['READY', 'PARTIAL', 'INSUFFICIENT', 'FAILED'].includes(result.state)) break; await new Promise(r => setTimeout(r, 100)); }
      if (!result || result.state === 'FAILED') throw new Error('Toolbar action grant did not permit read-only injection');
      if (result.agentInvoked || result.providerCalls !== 0) throw new Error('Unfamiliar site invoked agent or model');
      save('public-scan-summary.json', { url: page.url(), title: await page.title(), state: result.state, warnings: result.warnings, documentCount: result.documents?.length,
        headings: await page.locator('h1,h2').allTextContents(), characters: await page.evaluate(() => document.body.textContent.length) });
      await popup.screenshot({ path: `${directory}/public-page-activeTab.png` });
      results.push({ name: 'public-page-user-action', status: result.documents?.length ? 'PASS' : 'DEGRADED', url, scanState: result.state, agentInvoked: result.agentInvoked, providerCalls: result.providerCalls,
        documents: result.documents?.map(doc => ({ title: doc.title, type: doc.documentType, coverage: doc.extraction.status, chunks: doc.sourceChunks.length, characters: doc.extraction.extractedCharacterCount })),
        note: 'Read-only compatibility and permission injection, not a gold-label risk evaluation. No AI analysis or Page Agent action.' });
      await opened?.close();
    } catch (error) { results.push({ name: 'public-page-action-grant', status: 'BLOCKED', error: String(error), note: 'No all-sites permission or runtime bypass added.' }); }
    await cdp.detach();
  }
} catch (error) { failure = String(error); }
finally { save(`${mode}.json`, { measuredAt: new Date().toISOString(), status: failure ? 'FAIL' : results.some(r => r.status === 'BLOCKED') ? 'BLOCKED' : results.some(r => r.status === 'DEGRADED') ? 'DEGRADED' : 'PASS', failure, results }); await context?.close(); }
console.log(JSON.stringify({ mode, failure, results }, null, 2)); if (failure) process.exitCode = 1;
