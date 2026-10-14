import { z } from 'zod/v4';
import { analysisEnvelopeSchema } from './analysis-state';
import { scanReportSchema } from '../reflex/engine';
import type { ContractDocument } from '../extraction/schema';
export const uiSessionSchema = z.strictObject({
  sessionId: z.string().uuid(), tabId: z.number().int().nonnegative(), url: z.string().url(), title: z.string(),
  startedAt: z.string().datetime(), phase: z.enum(['INSPECTING', 'EXTRACTING', 'DISCOVERING', 'PREPARING', 'ANALYZING', 'DONE', 'INTERRUPTED']),
  invalidated: z.boolean(), chromeDocumentId: z.string().optional(), jobId: z.string().uuid().optional(), analysisStartedAt: z.string().datetime().optional(),
  frameId: z.number().int().nonnegative().optional(), topUrl: z.string().url().optional(),
});
export type UiSession = z.infer<typeof uiSessionSchema>;
export function belongsToTab(session: UiSession | undefined, tab: { id?: number; url?: string }): boolean {
  return !!session && !session.invalidated && session.tabId === tab.id && (session.topUrl ?? session.url) === tab.url;
}
export function validatedReport(stored: Record<string, unknown>, jobId: string) {
  const session = uiSessionSchema.safeParse(stored.uiSession);
  const scan = scanReportSchema.safeParse(stored.lastScan);
  const analysis = analysisEnvelopeSchema.safeParse(stored.lastAnalysis);
  if (!session.success || !scan.success || !analysis.success || session.data.jobId !== jobId || analysis.data.jobId !== jobId ||
    scan.data.sessionId !== session.data.sessionId || scan.data.documents.length !== 1 || !analysis.data.report) throw new Error('REPORT_UNAVAILABLE');
  const document = scan.data.documents[0]!;
  if (document.url !== session.data.url || document.documentId !== analysis.data.report.documentId || document.contentHash !== analysis.data.report.documentHash) throw new Error('REPORT_IDENTITY_MISMATCH');
  return { session: session.data, document, analysis: analysis.data };
}
export function sourceFinding(document: ContractDocument, analysis: z.infer<typeof analysisEnvelopeSchema>, findingId: string) {
  if (!analysis.report || analysis.report.documentId !== document.documentId || analysis.report.documentHash !== document.contentHash) throw new Error('REPORT_IDENTITY_MISMATCH');
  const finding = analysis.report.findings.find(item => item.findingId === findingId);
  const chunk = document.sourceChunks.find(item => item.chunkId === finding?.sourceChunkId);
  if (!finding || !chunk || finding.evidence.documentHash !== document.contentHash || finding.evidence.textHash !== chunk.textHash || finding.evidence.sourceChunkId !== chunk.chunkId || JSON.stringify(finding.evidence.sourceLocator) !== JSON.stringify(chunk.sourceLocator) || chunk.text.slice(finding.evidence.start, finding.evidence.end) !== finding.quote) throw new Error('SOURCE_UNAVAILABLE');
  if (finding.evidence.occurrences.length !== 1) throw new Error('SOURCE_NOT_UNIQUE');
  return { finding, chunk };
}
