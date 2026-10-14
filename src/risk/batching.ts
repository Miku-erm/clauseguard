import { CONTEXT } from '../core/config';
import type { ContractDocument, SourceChunk } from '../extraction/schema';
import { RISK_JSON_SCHEMA } from './schema';
import { RISK_SYSTEM_PROMPT } from './prompt';
export const OUTPUT_TOKENS = 1536;
export interface AnalysisBatch { batchId: string; chunks: SourceChunk[]; primaryChunkIds: string[]; userContent: string; estimatedPromptTokens: number }
export function sourceMessage(document: ContractDocument, chunks: SourceChunk[]): string {
  return JSON.stringify({ documentType: document.documentType, documentTitle: document.title, sourceData: chunks.map(chunk => ({ sourceChunkId: chunk.chunkId, headingPath: chunk.sourceLocator.headingPath, originalText: chunk.text })) });
}
/** UTF-8 byte upper estimate plus explicit template allowance, NOT a measured token count. */
export function estimatePromptTokens(userContent: string): number {
  return new TextEncoder().encode(RISK_SYSTEM_PROMPT + userContent + JSON.stringify(RISK_JSON_SCHEMA)).length + 256;
}
export function prepareBatches(document: ContractDocument): { batches: AnalysisBatch[]; unbatchable: string[]; contextWarnings: string[] } {
  const batches: AnalysisBatch[] = []; const unbatchable: string[] = []; const contextWarnings: string[] = []; let current: SourceChunk[] = []; let primary: string[] = [];
  const fits = (chunks: SourceChunk[]) => estimatePromptTokens(sourceMessage(document, chunks)) + OUTPUT_TOKENS <= CONTEXT;
  const emit = () => {
    if (!primary.length) return;
    const userContent = sourceMessage(document, current);
    batches.push({ batchId: `batch-${batches.length + 1}`, chunks: current, primaryChunkIds: primary, userContent, estimatedPromptTokens: estimatePromptTokens(userContent) });
    current = []; primary = [];
  };
  for (const chunk of document.sourceChunks) {
    const prior = current.at(-1);
    // Two new source chunks per semantic batch; keep prior context when it fits.
    // This limits output pressure without dropping source text or findings.
    if (primary.length >= 2) {
      emit();
      if (prior && !chunk.heading && fits([prior, chunk])) current = [prior];
      else if (prior && prior.sourceLocator.selector === chunk.sourceLocator.selector) contextWarnings.push(`Split clause context could not fit together: ${prior.chunkId}, ${chunk.chunkId}`);
    }
    // Prefer section boundaries; subsequent clauses in a section retain adjacent source context.
    if (chunk.heading && current.some(item => !item.heading)) emit();
    if (!fits([...current, chunk])) {
      emit();
      if (prior && !chunk.heading && fits([prior, chunk])) current = [prior];
      else if (prior && prior.sourceLocator.selector === chunk.sourceLocator.selector) contextWarnings.push(`Split clause context could not fit together: ${prior.chunkId}, ${chunk.chunkId}`);
    }
    if (!fits([...current, chunk])) { unbatchable.push(chunk.chunkId); continue; }
    current.push(chunk); primary.push(chunk.chunkId);
  }
  emit();
  return { batches, unbatchable, contextWarnings };
}
