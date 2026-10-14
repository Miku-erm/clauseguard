import { z } from 'zod/v4';
import { riskReportSchema, type RiskReport } from '../risk/schema';
export const analysisEnvelopeSchema = z.strictObject({ jobId: z.string().uuid(), status: z.enum(['RUNNING', 'FINISHED', 'FAILED', 'INTERRUPTED']), report: riskReportSchema.optional(), error: z.string().optional() });
export type AnalysisEnvelope = z.infer<typeof analysisEnvelopeSchema>;
/** Worker memory does not survive suspension/restart. Never preserve an eligible score on interruption. */
export function interruptedReport(report: RiskReport): RiskReport {
  return riskReportSchema.parse({ ...report, status: report.coverage.analyzedChunks.length ? 'PARTIAL' : 'FAILED', score: null, alarmLevel: null, categoryScores: {},
    scoreWithheldReason: 'Service Worker interrupted analysis; required processing did not finish.',
    coverage: { ...report.coverage, failedChunks: [...new Set([...report.coverage.failedChunks, ...report.coverage.pendingChunks])], pendingChunks: [], batches: report.coverage.batches.map(batch => batch.status === 'PENDING' ? { ...batch, status: 'CANCELLED', errors: [...batch.errors, 'Service Worker interrupted'] } : batch) },
    warnings: [...report.warnings, 'Service Worker interrupted; duration reflects the last saved checkpoint. Start a new analysis explicitly.'] });
}
