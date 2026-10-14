import { contractDocumentSchema, type ContractDocument } from '../extraction/schema';
import { CONTEXT, MODEL } from '../core/config';
import { prepareBatches, type AnalysisBatch } from './batching';
import { verifyDocumentIntegrity, verifyFinding } from './evidence';
import { InvalidRiskResponse, type AnalysisResponse } from './provider';
import { deduplicateFindings, calculateScore } from './scoring';
import { riskReportSchema, proposedResponseSchema, timingSchema, type BatchRecord, type RiskReport, type VerifiedFinding, type RejectedFinding } from './schema';
interface Dependencies {
  request: (batch: AnalysisBatch, signal: AbortSignal) => Promise<AnalysisResponse>;
  isCurrent?: () => Promise<boolean>; signal?: AbortSignal; timeoutMs?: number; onProgress?: (report: RiskReport) => Promise<void>;
}
export async function analyzeDocument(input: unknown, dependencies: Dependencies): Promise<RiskReport> {
  // Immutable snapshot; the caller cannot mutate the document during an await.
  const document: ContractDocument = contractDocumentSchema.parse(JSON.parse(JSON.stringify(input)));
  const started = performance.now(); const analyzedAt = new Date().toISOString(); const controller = new AbortController();
  const abort = () => controller.abort(dependencies.signal?.reason ?? new Error('Analysis cancelled'));
  if (dependencies.signal?.aborted) abort(); else dependencies.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error('Analysis deadline exceeded')), dependencies.timeoutMs ?? 900_000);
  const accepted: VerifiedFinding[] = []; const rejected: RejectedFinding[] = []; const unresolved: string[] = []; const warnings = [...document.extraction.warnings];
  const { batches, unbatchable, contextWarnings } = prepareBatches(document); unresolved.push(...contextWarnings);
  const records: BatchRecord[] = batches.map(batch => ({ batchId: batch.batchId, chunkIds: batch.chunks.map(chunk => chunk.chunkId), estimatedPromptTokens: batch.estimatedPromptTokens, status: 'PENDING', attempts: 0, errors: [], timings: [] }));
  const analyzed = new Set<string>(); const failed = new Set(unbatchable); let fatal = false;
  if (unbatchable.length) warnings.push(`${unbatchable.length} source chunks exceed the conservative input budget; they were not truncated and remain failed coverage.`);
  const buildReport = (finished: boolean): RiskReport => {
    const findings = deduplicateFindings(accepted);
    const allIds = document.sourceChunks.map(chunk => chunk.chunkId);
    const pending = allIds.filter(id => !analyzed.has(id) && !failed.has(id));
    const complete = finished && !fatal && document.extraction.status === 'COMPLETE' && allIds.length > 0 && analyzed.size === allIds.length && records.every(record => record.status === 'COMPLETE') && !rejected.length && !unresolved.length && !failed.size;
    const status = complete ? 'COMPLETE' : !allIds.length ? 'INSUFFICIENT' : fatal && !analyzed.size ? 'FAILED' : 'PARTIAL';
    const scoring = complete ? calculateScore(findings) : { score: null, alarmLevel: null, categoryScores: {} };
    const reasons = [document.extraction.status !== 'COMPLETE' ? `Extraction coverage is ${document.extraction.status}.` : '', !finished ? 'Analysis is still running.' : '', fatal ? 'Processing was interrupted, failed or became stale.' : '', analyzed.size !== allIds.length ? 'Not every source chunk was successfully analyzed.' : '', rejected.length ? 'Some proposed evidence was rejected.' : '', unresolved.length ? 'Unresolved interpretation or context issues remain.' : ''].filter(Boolean);
    return riskReportSchema.parse({ documentId: document.documentId, documentHash: document.contentHash, analyzedAt, status, ...scoring,
      scoreWithheldReason: complete ? null : reasons.join(' ') || 'No adequately verified complete source is available.', findings, rejectedFindings: rejected, rejectedFindingCount: rejected.length,
      unresolvedIssues: [...new Set(unresolved)], coverage: { extractionStatus: document.extraction.status, totalChunks: allIds.length, analyzedChunks: [...analyzed], failedChunks: [...failed], pendingChunks: pending, batches: records },
      modelInfo: { provider: 'ollama-local', model: MODEL, contextSize: CONTEXT }, durationMs: performance.now() - started, warnings });
  };
  const current = async () => {
    controller.signal.throwIfAborted();
    if (dependencies.isCurrent && !await dependencies.isCurrent()) throw new Error('Stale document or unexpected navigation');
  };
  const boundedRequest = async (batch: AnalysisBatch): Promise<AnalysisResponse> => {
    await current();
    let listener = () => {};
    const cancellation = new Promise<never>((_, reject) => { listener = () => reject(controller.signal.reason); controller.signal.addEventListener('abort', listener, { once: true }); });
    try { return await Promise.race([dependencies.request(batch, controller.signal), cancellation]); }
    finally { controller.signal.removeEventListener('abort', listener); }
  };
  try {
    if (!await verifyDocumentIntegrity(document)) throw new Error('Source document integrity/version mismatch');
    if (!document.sourceChunks.length) return buildReport(true);
    await current(); await dependencies.onProgress?.(buildReport(false));
    for (const [index, batch] of batches.entries()) {
      const record = records[index]!;
      let response: AnalysisResponse | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        record.attempts++;
        try {
          response = await boundedRequest(batch);
          try { response = { proposal: proposedResponseSchema.parse(response.proposal), timing: timingSchema.parse(response.timing) }; }
          catch { response = undefined; throw new InvalidRiskResponse('Analysis response failed runtime validation'); }
          await current(); break;
        }
        catch (error) {
          record.errors.push(String(error));
          if (controller.signal.aborted || !(error instanceof InvalidRiskResponse)) throw error;
        }
      }
      if (!response) { record.status = 'FAILED'; batch.primaryChunkIds.forEach(id => failed.add(id)); warnings.push(`${batch.batchId} failed structured response validation after two attempts.`); await dependencies.onProgress?.(buildReport(false)); continue; }
      record.timings.push(response.timing);
      for (const proposal of response.proposal.findings) {
        const evidence = await verifyFinding(document, proposal, document.contentHash, new Set(batch.chunks.map(chunk => chunk.chunkId)));
        if (evidence.accepted) accepted.push(evidence.accepted); if (evidence.rejected) rejected.push(evidence.rejected);
      }
      for (const issue of response.proposal.unresolvedIssues) {
        unresolved.push(batch.chunks.some(chunk => chunk.chunkId === issue.sourceChunkId) ? issue.issueTr : 'An unresolved issue referenced an unavailable source chunk; interpretation cannot be accepted.');
      }
      record.status = 'COMPLETE'; batch.primaryChunkIds.forEach(id => { analyzed.add(id); failed.delete(id); });
      await dependencies.onProgress?.(buildReport(false));
    }
    await current();
  } catch (error) {
    fatal = true; warnings.push(String(error));
    const inFlight = records.find(record => record.status === 'PENDING' && record.attempts > 0);
    if (inFlight) { inFlight.status = controller.signal.aborted ? 'CANCELLED' : 'FAILED'; inFlight.errors.push(String(error)); const batch = batches.find(batch => batch.batchId === inFlight.batchId)!; batch.primaryChunkIds.forEach(id => failed.add(id)); }
  } finally { clearTimeout(timeout); dependencies.signal?.removeEventListener('abort', abort); }
  return buildReport(true);
}
