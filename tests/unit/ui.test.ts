import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { errorTr, scoreView, withholdingReasons, pageAccessibility, statusTr, connectionTr } from '../../src/ui/presentation';
import { belongsToTab, validatedReport, sourceFinding, type UiSession } from '../../src/extension/ui-session';
import { uiCommandSchema, uiPage, authorizeUiCommand } from '../../src/extension/ui-protocol';
import { sourceRange, highlightSource, navigateSourceSchema } from '../../src/extension/source-navigation';
import { extractDocuments } from '../../src/extraction/dom';
import { verifyFinding } from '../../src/risk/evidence';
import { analyzeDocument } from '../../src/risk/orchestrator';
import type { RiskReport } from '../../src/risk/schema';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
const complete = JSON.parse(readFileSync('docs/evidence/p2-model-current/renewal.json', 'utf8')).report as RiskReport;
const partial = JSON.parse(readFileSync('docs/evidence/p2-model-current/injection.json', 'utf8')).report as RiskReport;
const jobId = '12345678-1234-4234-8234-123456789012'; const sessionId = '22345678-1234-4234-8234-123456789012';
const session: UiSession = { sessionId, jobId, tabId: 7, url: 'http://127.0.0.1:4173/p2/renewal.html', title: 'Koşullar', startedAt: new Date().toISOString(), phase: 'DONE', invalidated: false };
describe('Turkish UI presentation and truthful scores', () => {
  it('does not recalculate an eligible engine score', () => { expect(scoreView(complete).score).toBe(complete.score); expect(scoreView(complete).label).toBe('Düşük uyarı'); });
  it('never substitutes zero for a missing score', () => { expect(scoreView(partial)).toMatchObject({ score: null, eligible: false, label: 'Güvenilir risk puanı hesaplanamadı.' }); });
  it('withholds a stale source score even when an old engine report was complete', () => { expect(scoreView(complete, true).score).toBeNull(); expect(withholdingReasons(complete, true)[0]).toContain('değişmiş'); });
  it('explains rejected interpretation separately from verified findings', () => { expect(withholdingReasons(partial).join(' ')).toContain('doğrulanmış hukuki sorunlar değildir'); });
  it('denies Chrome/file/missing URLs and permits HTTP(S) without claiming a grant', () => { for (const url of ['chrome://settings', 'file:///terms.html', undefined]) expect(pageAccessibility(url).allowed).toBe(false); expect(pageAccessibility('https://example.test/terms').allowed).toBe(true); });
  it('maps progress from actual lifecycle states', () => { expect(statusTr.DISCOVERING).toBe('Page Agent çalışıyor'); expect(statusTr.INTERRUPTED).toContain('kesintiye'); });
  it('separates installed model inventory from GPU readiness', () => { expect(connectionTr({ connected: true, detail: 'available locally' })).toContain('kurulu'); expect(connectionTr({ connected: false, detail: 'Authorized model missing' })).toContain('kurulu değil'); });
  it.each(['Ollama runtime missing', 'Authorized model missing', 'CPU or mixed residency', 'SOURCE_TAB_CLOSED', 'SOURCE_VERSION_CHANGED', 'SOURCE_NOT_UNIQUE', 'Analysis cancelled', 'Service Worker interrupted', 'Cannot access contents of url', 'Structured response failed', 'REPORT_UNAVAILABLE'])('shows a bounded explanation rather than a stack for %s', error => { const result = errorTr(error + '\nat internal.js:99'); expect(result).not.toContain('internal.js'); expect(result.length).toBeGreaterThan(20); });
});
describe('report and message identity', () => {
  it('never attaches a session to another tab, URL or invalidated version', () => { expect(belongsToTab(session, { id: 7, url: session.url })).toBe(true); expect(belongsToTab(session, { id: 8, url: session.url })).toBe(false); expect(belongsToTab(session, { id: 7, url: 'https://other.test' })).toBe(false); expect(belongsToTab({ ...session, invalidated: true }, { id: 7, url: session.url })).toBe(false); });
  it('parses only supported strict commands, without source payloads or endpoints', () => { expect(uiCommandSchema.safeParse({ type: 'NAVIGATE_SOURCE', jobId, findingId: 'a'.repeat(64) }).success).toBe(true); expect(uiCommandSchema.safeParse({ type: 'GET_REPORT', jobId, document: 'secret' }).success).toBe(false); expect(uiCommandSchema.safeParse({ type: 'GET_REPORT', jobId: '../' }).success).toBe(false); });
  it('authorizes only exact packaged page identities and bounded capabilities', () => { const id = 'a'.repeat(32), root = `chrome-extension://${id}/`; expect(uiPage({ id, url: root + `report.html?id=${jobId}` }, id, root)).toBe('report'); expect(uiPage({ id, tab: { id: 7 }, url: 'https://site.test/popup.html' }, id, root)).toBeNull(); expect(uiPage({ id, url: root + 'report.html?id=bad' }, id, root)).toBeNull(); expect(authorizeUiCommand('settings', 'NAVIGATE_SOURCE')).toBe(false); expect(authorizeUiCommand('report', 'CLEAR_DATA')).toBe(false); });
  it('rejects missing or mismatched report sessions rather than adopting an old report', async () => {
    const dom = new DOMParser().parseFromString(readFileSync('fixtures/p2/renewal.html', 'utf8'), 'text/html'); const doc = (await extractDocuments(dom, session.url)).documents[0]!;
    const scan = { sessionId, state: 'READY', path: 'FAST', agentInvoked: false, providerCalls: 0, durationMs: 1, states: ['READY'], documents: [doc], warnings: [] };
    const stored = { uiSession: session, lastScan: scan, lastAnalysis: { jobId, status: 'FINISHED', report: complete } };
    expect(validatedReport(stored, jobId).document.contentHash).toBe(doc.contentHash);
    expect(() => validatedReport(stored, sessionId)).toThrow(); expect(() => validatedReport({ ...stored, uiSession: { ...session, url: 'https://other.test' } }, jobId)).toThrow();
    expect(() => validatedReport({ ...stored, lastAnalysis: { jobId, status: 'FINISHED', report: { ...complete, documentHash: 'a'.repeat(64) } } }, jobId)).toThrow();
  });
});
describe('exact source navigation', () => {
  async function input() {
    document.body.innerHTML = '<main><article><h1>Subscription Terms</h1><p>First <em>your subscription renews automatically</em> each month at the current price.</p></article></main>';
    const doc = (await extractDocuments(document)).documents[0]!; const chunk = doc.sourceChunks.find(c => c.text.includes('automatically'))!;
    const quote = 'your subscription renews automatically each month'; const start = chunk.text.indexOf(quote);
    return { doc, chunk, command: { type: 'HIGHLIGHT_SOURCE' as const, expectedUrl: location.href, documentId: doc.documentId, documentHash: doc.contentHash, sourceChunkId: chunk.chunkId, quote, start, end: start + quote.length, locator: chunk.sourceLocator } };
  }
  it('resolves a precise quote across inline text nodes', async () => { const { command } = await input(); expect(sourceRange(document, command).range.toString()).toBe(command.quote); });
  it('rejects altered node paths and mismatched quotation offsets', async () => { const { command } = await input(); expect(() => sourceRange(document, { ...command, start: 0 })).toThrow(); expect(() => sourceRange(document, { ...command, locator: { ...command.locator, segments: [{ path: [99], start: 0, end: 3 }] } })).toThrow(); });
  it('rejects an ambiguous selector instead of choosing the first match', async () => { const { command } = await input(); document.body.append(document.createElement('p')); expect(() => sourceRange(document, { ...command, locator: { ...command.locator, selector: 'p' } })).toThrow('SOURCE_NOT_UNIQUE'); });
  it('rejects a real changed source hash before any highlight', async () => { const { command } = await input(); document.querySelector('p')!.append(' changed'); await expect(highlightSource(document, command)).rejects.toThrow('SOURCE_VERSION_CHANGED'); });
  it('accepts only the bounded highlight command', async () => { const { command } = await input(); expect(navigateSourceSchema.safeParse(command).success).toBe(true); expect(navigateSourceSchema.safeParse({ ...command, script: 'alert(1)' }).success).toBe(false); });
  it('rejects nonaccepted findings and repeated quote positions', async () => {
    const { doc, chunk } = await input(); const proposal = { category: 'AUTOMATIC_RENEWAL' as const, severity: 'MEDIUM' as const, sourceChunkId: chunk.chunkId, quote: chunk.text, explanationTr: 'Abonelik otomatik olarak yenilenebilir.', reasonTr: 'Kullanıcı için ücretlendirme dezavantajı.' };
    const verified = (await verifyFinding(doc, proposal, doc.contentHash, new Set([chunk.chunkId]))).accepted!;
    const report = await analyzeDocument(doc, { request: async () => ({ proposal: { findings: [proposal], unresolvedIssues: [] }, timing: { wallMs: 1, promptTokens: 1, generatedTokens: 1, promptMs: 1, generationMs: 1, totalMs: 1, loadMs: 0, tokensPerSecond: 1 } }) });
    expect(sourceFinding(doc, { jobId, status: 'FINISHED', report }, verified.findingId).finding.quote).toBe(chunk.text);
    expect(() => sourceFinding(doc, { jobId, status: 'FINISHED', report }, 'b'.repeat(64))).toThrow();
    expect(() => sourceFinding(doc, { jobId, status: 'FINISHED', report: { ...report, findings: [{ ...verified, evidence: { ...verified.evidence, sourceLocator: { ...verified.evidence.sourceLocator, selector: 'body' } } }] } }, verified.findingId)).toThrow('SOURCE_UNAVAILABLE');
    expect(() => sourceFinding(doc, { jobId, status: 'FINISHED', report: { ...report, findings: [{ ...verified, evidence: { ...verified.evidence, occurrences: [0, 10] } }] } }, verified.findingId)).toThrow('SOURCE_NOT_UNIQUE');
  });
});
