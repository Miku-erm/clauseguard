import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { loadRisk } from './load-risk.mjs';
const risk = await loadRisk(); const dir = '.local/p4/real'; mkdirSync('evaluation/annotations', { recursive: true });
if (!existsSync(`${dir}/reddit.json`)) {
  const original = readFileSync(`${dir}/reddit.html`, 'utf8'); const dom = new JSDOM(original, { url: 'https://redditinc.com/policies/user-agreement' });
  const branch = dom.window.document.getElementById('text-content1');
  if (!branch?.textContent.includes('outside the EEA')) throw new Error('Regional snapshot cannot be verified');
  // Explicit derived snapshot: retain one actual official branch, no clause rewriting.
  const isolated = new JSDOM('<!doctype html><html><head><title>Reddit User Agreement</title></head><body><main><h1>Reddit User Agreement</h1></main></body></html>', { url: dom.window.location.href });
  isolated.window.document.querySelector('main').appendChild(isolated.window.document.importNode(branch, true));
  const html = isolated.serialize(); writeFileSync(`${dir}/reddit-us.html`, html);
  const document = (await risk.extractDocuments(isolated.window.document)).documents[0];
  if (!document) throw new Error('Official isolated snapshot unrecognized');
  writeFileSync(`${dir}/reddit.json`, JSON.stringify(document, null, 2));
  const sources = JSON.parse(readFileSync('evaluation/sources.json', 'utf8')); const s = sources.find(s => s.id === 'reddit');
  Object.assign(s, { status: 'EXTRACTED', extractionMethod: 'Authorized private snapshot fallback: official #text-content1 only; second regional version excluded, generic title wrapper added; existing extractor unchanged', accessedAt: new Date().toISOString(), snapshotSha256: createHash('sha256').update(original).digest('hex'), derivedSnapshotSha256: createHash('sha256').update(html).digest('hex'), privateSnapshot: `${dir}/reddit-us.html`, documentId: document.documentId, documentHash: document.contentHash, documentType: document.documentType, characters: document.extraction.extractedCharacterCount, chunks: document.sourceChunks.length, extractionCoverage: document.extraction.status }); delete s.error;
  writeFileSync('evaluation/sources.json', JSON.stringify(sources, null, 2));
}
if (existsSync('evaluation/annotations/gold.json')) throw new Error('Frozen reference already exists; do not overwrite to fit predictions');
if (existsSync('evaluation/annotations/reference-source-hashes.json')) {
  for (const pinned of JSON.parse(readFileSync('evaluation/annotations/reference-source-hashes.json','utf8'))) {
    const actual = JSON.parse(readFileSync(`${dir}/${pinned.sourceId}.json`,'utf8'));
    if (actual.contentHash !== pinned.documentHash) throw new Error(`Source version changed: ${pinned.sourceId}. Direct reading and a new independent reference revision are required; ordinal labels cannot be reused.`);
  }
}
// Selected independently by direct reading BEFORE predictions. Explicit clause-level sample, not exhaustive gold.
const definitions = [
 ['github',190,'DIFFICULT_CANCELLATION_OR_REFUND','MEDIUM','Billing Schedule; No Refunds','Advance-paid unused months are non-refundable, although paid service continues.'],
 ['discord',120,'LIMITATION_OF_LIABILITY','MEDIUM','Limitation of liability','Broad consequential-loss exclusion subject to applicable-law and nonwaivable consumer protections.'],
 ['discord',121,'LIMITATION_OF_LIABILITY','MEDIUM','Limitation of liability','Three-month payments or $100 cap, expressly excluding liability that cannot legally be limited.'],
 ['spotify',56,'DIFFICULT_CANCELLATION_OR_REFUND','LOW','Ödemeler ve iptal','No partial-period refunds, qualified by exceptions elsewhere and anytime cancellation.'],
 ['spotify',108,'LIMITATION_OF_LIABILITY','MEDIUM','Sorumluluk Sınırlaması','Broad exclusions and twelve-month payments/$30 cap; adjacent paragraph 109 preserves nonwaivable liability.'],
 ['dropbox',44,'DIFFICULT_CANCELLATION_OR_REFUND','LOW','Paid Accounts / Cancellation','Refunds limited to those required by law, including explicit EU fourteen-day withdrawal protection; cancellation is available anytime.'],
 ['dropbox',72,'LIMITATION_OF_LIABILITY','MEDIUM','Limitation of Liability','Low $20/current plan cap, subject to nonwaivable liability and EU-law carve-out.'],
];
const reddit = JSON.parse(readFileSync(`${dir}/reddit.json`, 'utf8'));
console.log('REDDIT_REVIEW', JSON.stringify(reddit.sourceChunks.filter(c => /LIABILITY|liability.*(?:exceed|limit)|non-refundable|nonrefundable/i.test(c.text)).map(c => ({order:c.order,chunkId:c.chunkId,text:c.text}))));
const gold = definitions.map(([id, order, category, severity, section, rationale], index) => {
  const doc = JSON.parse(readFileSync(`${dir}/${id}.json`, 'utf8')); const c = doc.sourceChunks.find(c => c.order === order);
  if (!c) throw new Error(`Missing independent reference ${id}/${order}`);
  return { id: `draft-${index + 1}`, sourceId: id, documentId: doc.documentId, documentHash: doc.contentHash, category, chunkId: c.chunkId, start: 0, end: c.text.length, severity, section, rationale, status: 'PENDING_HUMAN_REVIEW' };
});
writeFileSync('evaluation/annotations/gold.json', JSON.stringify({ frozenAt: new Date().toISOString(), methodology: 'Direct source reading; selected-clause reference only, not exhaustive document annotation; no Qwen predictions read; all metrics PROVISIONAL', labels: gold }, null, 2));
writeFileSync('evaluation/annotations/review-log.json', JSON.stringify([{ at: new Date().toISOString(), action: 'Independent preprediction draft frozen', humanReviewed: false, sha256: createHash('sha256').update(readFileSync('evaluation/annotations/gold.json')).digest('hex') }], null, 2));
