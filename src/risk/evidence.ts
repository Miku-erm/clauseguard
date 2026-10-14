import { hashText } from '../extraction/text';
import type { ContractDocument } from '../extraction/schema';
import { proposedFindingSchema, type ProposedFinding, type RejectedFinding, type VerifiedFinding } from './schema';
export async function verifyDocumentIntegrity(document: ContractDocument): Promise<boolean> {
  if (document.extraction.extractedChunkCount !== document.sourceChunks.length || document.extraction.extractedCharacterCount !== document.sourceChunks.reduce((sum, chunk) => sum + chunk.text.length, 0)) return false;
  const blocks: Array<[string, string, string[]]> = []; let previousEnd = -1;
  const ids = new Set<string>();
  for (const [index, chunk] of document.sourceChunks.entries()) {
    if (ids.has(chunk.chunkId) || chunk.order !== index || await hashText(chunk.text) !== chunk.textHash || chunk.sourceLocator.textEnd - chunk.sourceLocator.textStart !== chunk.text.length) return false;
    ids.add(chunk.chunkId); const last = blocks.at(-1);
    if (last && last[0] === chunk.sourceLocator.selector && previousEnd === chunk.sourceLocator.textStart && JSON.stringify(last[2]) === JSON.stringify(chunk.sourceLocator.headingPath)) last[1] += chunk.text;
    else { if (chunk.sourceLocator.textStart !== 0) return false; blocks.push([chunk.sourceLocator.selector, chunk.text, chunk.sourceLocator.headingPath]); }
    previousEnd = chunk.sourceLocator.textEnd;
  }
  const contentHash = await hashText(JSON.stringify(blocks));
  return contentHash === document.contentHash && await hashText(JSON.stringify([document.url, document.documentType, contentHash])) === document.documentId;
}
export async function verifyFinding(document: ContractDocument, proposed: ProposedFinding, expectedHash: string, batchIds: Set<string>): Promise<{ accepted?: VerifiedFinding; rejected?: RejectedFinding }> {
  const proposal = proposedFindingSchema.parse(proposed);
  const reject = (reason: RejectedFinding['reason']) => ({ rejected: { proposal, reason } });
  if (document.contentHash !== expectedHash) return reject('VERSION_MISMATCH');
  const chunk = document.sourceChunks.find(chunk => chunk.chunkId === proposal.sourceChunkId);
  if (!chunk) return reject('UNKNOWN_CHUNK');
  if (!batchIds.has(chunk.chunkId)) return reject('OUTSIDE_BATCH');
  if (await hashText(chunk.text) !== chunk.textHash) return reject('INTEGRITY_FAILURE');
  // Only one-to-one NBSP/narrow-NBSP equivalence. No collapsing, punctuation or fuzzy repair.
  // Keep original source offsets and restore the original span for display/highlighting.
  const equivalent = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');
  const source = equivalent(chunk.text); const quote = equivalent(proposal.quote);
  const occurrences: number[] = []; let from = 0; let position: number;
  while ((position = source.indexOf(quote, from)) !== -1) { occurrences.push(position); from = position + 1; }
  if (!occurrences.length) return reject('QUOTE_MISMATCH');
  // Narrow conservative relevance guard, not a classifier or proof of legal correctness.
  // A cancellation deadline/consent clause cannot establish data retention by omission.
  if (proposal.category === 'UNCLEAR_DATA_RETENTION' &&
      (!/retain|retention|stor(?:e|ed|age|ing)|\bkeep\b|\bkept\b|sakla|saklan|tutul/i.test(chunk.text) ||
       !/\bdata\b|personal|information|records|veri|kişisel|bilgi/i.test(chunk.text))) return reject('CATEGORY_CONTEXT_MISMATCH');
  const start = occurrences[0]!;
  const originalQuote = chunk.text.slice(start, start + proposal.quote.length);
  // Report only literal repeats of the restored original, not different space variants.
  const literalOccurrences = occurrences.filter(offset => chunk.text.slice(offset, offset + originalQuote.length) === originalQuote);
  return { accepted: { ...proposal, quote: originalQuote, findingId: await hashText(JSON.stringify([document.documentId, chunk.chunkId, proposal.category, originalQuote])),
    evidence: { sourceChunkId: chunk.chunkId, textHash: chunk.textHash, documentHash: expectedHash, start, end: start + proposal.quote.length, occurrences: literalOccurrences, sourceLocator: chunk.sourceLocator } } };
}
