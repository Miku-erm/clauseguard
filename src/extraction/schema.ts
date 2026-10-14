import { z } from 'zod/v4';

export const documentTypeSchema = z.enum(['privacy_policy', 'terms_of_service', 'subscription_terms', 'unknown']);
export const extractionStatusSchema = z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN', 'FAILED']);
const segmentSchema = z.strictObject({ path: z.array(z.number().int().nonnegative()), start: z.number().int().nonnegative(), end: z.number().int().nonnegative() });
export const sourceLocatorSchema = z.strictObject({
  selector: z.string(), headingPath: z.array(z.string()), textStart: z.number().int().nonnegative(), textEnd: z.number().int().nonnegative(),
  segments: z.array(segmentSchema).min(1),
});
export const sourceChunkSchema = z.strictObject({
  chunkId: z.string(), text: z.string().min(1), analysisText: z.string().min(1), heading: z.string().optional(),
  sourceLocator: sourceLocatorSchema, textHash: z.string().regex(/^[a-f0-9]{64}$/), order: z.number().int().nonnegative(),
});
export const coverageSchema = z.strictObject({
  detectedSections: z.array(z.string()), extractedSections: z.array(z.string()), unopenedSections: z.array(z.string()),
  knownMissingSections: z.array(z.string()), uncertainty: z.array(z.string()), expectedRegion: z.string().optional(),
});
export const contractDocumentSchema = z.strictObject({
  documentId: z.string(), url: z.string().url(), title: z.string(), documentType: documentTypeSchema,
  sourceChunks: z.array(sourceChunkSchema), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  extraction: z.strictObject({ status: extractionStatusSchema, extractedChunkCount: z.number().int().nonnegative(),
    extractedCharacterCount: z.number().int().nonnegative(), warnings: z.array(z.string()), excludedRegions: z.array(z.string()), coverage: coverageSchema }),
  createdAt: z.string().datetime(),
});
export type ContractDocument = z.infer<typeof contractDocumentSchema>;
export type SourceChunk = z.infer<typeof sourceChunkSchema>;
export type SourceLocator = z.infer<typeof sourceLocatorSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export interface ExtractionResult { documents: ContractDocument[]; warnings: string[]; ambiguous: boolean }
