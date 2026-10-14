import { z } from 'zod/v4';
import { CATEGORY_IDS } from './categories';
import { extractionStatusSchema, sourceLocatorSchema } from '../extraction/schema';
import { CONTEXT, MODEL } from '../core/config';
export const proposedFindingSchema = z.strictObject({
  category: z.enum(CATEGORY_IDS), severity: z.enum(['LOW', 'MEDIUM', 'HIGH']), sourceChunkId: z.string().min(1).max(100),
  quote: z.string().min(8).max(1400), explanationTr: z.string().min(12).max(600), reasonTr: z.string().min(12).max(600),
});
export const unresolvedIssueSchema = z.strictObject({ sourceChunkId: z.string().min(1).max(100), issueTr: z.string().min(16).max(400) });
export const proposedResponseSchema = z.strictObject({ findings: z.array(proposedFindingSchema).max(8), unresolvedIssues: z.array(unresolvedIssueSchema).max(8) });
export const RISK_JSON_SCHEMA = z.toJSONSchema(proposedResponseSchema, { target: 'draft-7' });
export type ProposedFinding = z.infer<typeof proposedFindingSchema>;
export type ProposedResponse = z.infer<typeof proposedResponseSchema>;
export const evidenceSchema = z.strictObject({ sourceChunkId: z.string(), textHash: z.string(), documentHash: z.string(),
  start: z.number().int().nonnegative(), end: z.number().int().positive(), occurrences: z.array(z.number().int().nonnegative()).min(1), sourceLocator: sourceLocatorSchema });
export const verifiedFindingSchema = proposedFindingSchema.extend({ findingId: z.string(), evidence: evidenceSchema });
export type VerifiedFinding = z.infer<typeof verifiedFindingSchema>;
export const rejectedFindingSchema = z.strictObject({ proposal: proposedFindingSchema, reason: z.enum(['UNKNOWN_CHUNK', 'OUTSIDE_BATCH', 'QUOTE_MISMATCH', 'VERSION_MISMATCH', 'INTEGRITY_FAILURE', 'CATEGORY_CONTEXT_MISMATCH']) });
export type RejectedFinding = z.infer<typeof rejectedFindingSchema>;
export const timingSchema = z.strictObject({ wallMs: z.number().nonnegative(), promptTokens: z.number().int().nonnegative(), generatedTokens: z.number().int().nonnegative(),
  promptMs: z.number().nonnegative(), generationMs: z.number().nonnegative(), totalMs: z.number().nonnegative(), loadMs: z.number().nonnegative(), tokensPerSecond: z.number().nonnegative() });
export const batchRecordSchema = z.strictObject({ batchId: z.string(), chunkIds: z.array(z.string()), estimatedPromptTokens: z.number().int().nonnegative(),
  status: z.enum(['PENDING', 'COMPLETE', 'FAILED', 'CANCELLED']), attempts: z.number().int().nonnegative(), errors: z.array(z.string()), timings: z.array(timingSchema) });
export type BatchRecord = z.infer<typeof batchRecordSchema>;
export const riskReportSchema = z.strictObject({
  documentId: z.string(), documentHash: z.string(), analyzedAt: z.string().datetime(), status: z.enum(['COMPLETE', 'PARTIAL', 'INSUFFICIENT', 'FAILED']),
  score: z.number().int().min(0).max(100).nullable(), alarmLevel: z.enum(['LOW', 'CAUTION', 'HIGH', 'CRITICAL']).nullable(), scoreWithheldReason: z.string().nullable(),
  categoryScores: z.record(z.string(), z.number().nonnegative()), findings: z.array(verifiedFindingSchema), rejectedFindings: z.array(rejectedFindingSchema), rejectedFindingCount: z.number().int().nonnegative(),
  unresolvedIssues: z.array(z.string()), coverage: z.strictObject({ extractionStatus: extractionStatusSchema, totalChunks: z.number().int().nonnegative(),
    analyzedChunks: z.array(z.string()), failedChunks: z.array(z.string()), pendingChunks: z.array(z.string()), batches: z.array(batchRecordSchema) }),
  modelInfo: z.strictObject({ provider: z.literal('ollama-local'), model: z.literal(MODEL), contextSize: z.literal(CONTEXT) }),
  durationMs: z.number().nonnegative(), warnings: z.array(z.string()),
});
export type RiskReport = z.infer<typeof riskReportSchema>;
