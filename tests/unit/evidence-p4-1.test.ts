import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { extractDocuments } from '../../src/extraction/dom';
import { verifyFinding, verifyDocumentIntegrity } from '../../src/risk/evidence';
import type { ProposedFinding } from '../../src/risk/schema';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
async function check(text:string, quote:string) {
 const doc = new DOMParser().parseFromString(`<article><h1>Subscription Terms</h1><p>${text}</p><p>Adjacent unrelated clause.</p></article>`, 'text/html');
 const document = (await extractDocuments(doc,'https://example.test/terms')).documents[0]!;
 const chunk = document.sourceChunks[1]!;
 const proposed: ProposedFinding = {category:'DIFFICULT_CANCELLATION_OR_REFUND',severity:'LOW',sourceChunkId:chunk.chunkId,quote,explanationTr:'İadeler yalnızca yasa gerektirirse yapılır.',reasonTr:'İade koşulu kullanıcı için sınırlıdır.'};
 return {document, chunk, result: await verifyFinding(document,proposed,document.contentHash,new Set([chunk.chunkId]))};
}
describe('P4.1 reversible space equivalence',()=>{
 it('restores exact original NBSP span, offsets and immutable hashes',async()=>{
 const {document,chunk,result}=await check('Refunds\u00a0are only issued if\u202frequired by law.','Refunds are only issued if required by law.');
 expect(result.accepted?.quote).toBe(chunk.text); expect(result.accepted?.evidence.start).toBe(0); expect(result.accepted?.evidence.end).toBe(chunk.text.length); expect(await verifyDocumentIntegrity(document)).toBe(true);
 });
 it('keeps repeated occurrences and chooses the original first span',async()=>{
 const {result}=await check('No\u00a0refunds. No\u00a0refunds.','No refunds.'); expect(result.accepted?.evidence.occurrences).toEqual([0,12]); expect(result.accepted?.quote).toBe('No\u00a0refunds.');
 });
 it('does not label different original space variants as literal repeats',async()=>{
 const {result}=await check('No\u00a0refunds. No\u202frefunds.','No refunds.'); expect(result.accepted?.evidence.occurrences).toEqual([0]);
 });
 it.each(['No  refunds.','No refunds...','No refunds. Adjacent unrelated clause.','No REFUNDS.','No refunds!'])('rejects non-equivalent quote %s',async quote=>{expect((await check('No\u00a0refunds.',quote)).result.rejected?.reason).toBe('QUOTE_MISMATCH');});
});
