import { browserExecutable } from './lib/browser.mjs';
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = '.local/p4/sources'; mkdirSync(root, { recursive: true }); mkdirSync('evaluation', { recursive: true });
const definitions = [
  { id: 'github', url: 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service', language: 'en', region: 'GitHub standard individual-user terms; US/California provisions', version: 'Effective April 27, 2026' },
  { id: 'discord', url: 'https://discord.com/terms', language: 'en', region: 'General terms with region-specific dispute provisions', version: 'Effective September 29, 2025' },
  { id: 'reddit', url: 'https://redditinc.com/policies/user-agreement', language: 'en', region: 'US and outside EEA/UK/Switzerland ONLY; EEA branch excluded', version: 'Effective July 1, 2026; revised May 26, 2026' },
  { id: 'spotify', url: 'https://www.spotify.com/tr-tr/legal/end-user-agreement/', language: 'tr', region: 'tr-tr Turkish regional version', version: null },
  { id: 'dropbox', url: 'https://www.dropbox.com/terms', language: 'en', region: 'General consumer terms; regional exceptions retained, announced 2027 version not followed', version: 'Effective January 7, 2025' },
];
const executable = browserExecutable();
const context = await chromium.launchPersistentContext(resolve(`.local/p4-acquire-${randomUUID()}`), { executablePath: executable, channel: 'chromium', headless: true, args: ['--disable-gpu', '--disable-background-networking', '--disable-component-update'] });
const records = [];
for (const definition of definitions) {
  const path = `${root}/${definition.id}.html`;
  if (existsSync(path)) throw new Error(`Immutable capture already exists: ${path}. Use a new acquisition directory rather than overwrite.`);
  const page = await context.newPage();
  try {
    const response = await page.goto(definition.url, { waitUntil: 'domcontentloaded', timeout: 35_000 });
    if (!response?.ok()) throw new Error(`Official source HTTP ${response?.status()}`);
    await page.locator('h1').first().waitFor({ timeout: 12_000 });
    const html = await page.content(); writeFileSync(path, html);
    const metadata = await page.evaluate(() => ({ title: document.title, headings: [...document.querySelectorAll('main h1,main h2,main h3,article h1,article h2,article h3')].map(el => ({ text: el.textContent.trim(), id: el.id })),
      dateCandidates: document.body.innerText.split('\n').filter(text => /effective|last revised|posted:|202[0-9]|yürürlük|güncell|guncell/i.test(text)).slice(0, 18),
      regionalLinks: [...document.querySelectorAll('a[href*="#"]')].filter(el => /EEA|Switzerland|United States/.test(el.textContent)).map(el => ({ text: el.textContent.trim(), href: el.getAttribute('href') })) }));
    const record = { ...definition, accessedAt: new Date().toISOString(), finalUrl: page.url(), httpStatus: response.status(), snapshotSha256: createHash('sha256').update(html).digest('hex'), privateSnapshot: path, ...metadata,
      acquisition: 'Real browser GET from official source; no login, restriction bypass, consent click or automatic Page Agent action. Full HTML private and ignored by Git.' };
    records.push(record); console.log(JSON.stringify({ id: record.id, title: record.title, version: record.version, dates: record.dateCandidates, regionalLinks: record.regionalLinks }));
  } catch (error) { records.push({ ...definition, accessedAt: new Date().toISOString(), status: 'BLOCKED', error: String(error) }); console.log(JSON.stringify(records.at(-1))); }
  await page.close();
}
await context.close(); writeFileSync(`${root}/acquisition.json`, JSON.stringify(records, null, 2));
writeFileSync('evaluation/sources.json', JSON.stringify(records.map(({ headings, dateCandidates, regionalLinks, ...record }) => record), null, 2));
