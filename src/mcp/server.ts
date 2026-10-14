import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod/v4';
import { CATEGORIES, CATEGORY_IDS } from '../risk/categories';
import { verifyFinding } from '../risk/evidence';
import { analyzeDocument } from '../risk/orchestrator';
import { requestRiskBatch } from '../risk/provider';
import { prepareGpuModel } from '../llm/provider';
import { verifiedFindingSchema, rejectedFindingSchema, riskReportSchema } from '../risk/schema';
import { suppliedDocument, suppliedDocumentSchema } from './document';

export const categoryOutputSchema = z.strictObject({ categories: z.array(z.strictObject({
  id: z.enum(CATEGORY_IDS), titleTr: z.string(), descriptionTr: z.string(), weight: z.number().positive(), guidance: z.string(),
})).length(8) });
export const evidenceInputSchema = suppliedDocumentSchema.extend({
  quote: z.string().min(1).max(1600), category: z.enum(CATEGORY_IDS),
  expectedDocumentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(), sourceChunkId: z.string().max(100).optional(),
});
export const evidenceOutputSchema = z.strictObject({ documentId: z.string(), documentHash: z.string(), sourceChunkId: z.string(),
  verified: z.boolean(), accepted: verifiedFindingSchema.optional(), rejected: rejectedFindingSchema.optional() });
export const analysisOutputSchema = z.strictObject({ report: riskReportSchema, disclaimer: z.literal('Bu uygulama hukuki tavsiye vermez.') });
const output = (data: Record<string, unknown>) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }], structuredContent: data });

export function createClauseGuardServer() {
  const server = new McpServer({ name: 'clauseguard', version: '1.0.0' }); let busy = false;
  server.registerTool('get_risk_categories', {
    description: 'Return the existing ClauseGuard categories and unchanged scoring weights.',
    inputSchema: z.strictObject({}), outputSchema: categoryOutputSchema,
  }, async () => output(categoryOutputSchema.parse({ categories: CATEGORY_IDS.map(id => {
    const { titleTr, descriptionTr, weight, guidance } = CATEGORIES[id]; return { id, titleTr, descriptionTr, weight, guidance };
  }) })));
  server.registerTool('verify_evidence', {
    description: 'Verify a quotation against explicitly supplied text, using original hashes and the existing strict Evidence Validator. No browsing or file access.',
    inputSchema: evidenceInputSchema, outputSchema: evidenceOutputSchema,
  }, async input => {
    const doc = await suppliedDocument(input); const chunk = doc.sourceChunks.find(c => !c.heading)!;
    const sourceChunkId = input.sourceChunkId ?? chunk.chunkId;
    const verification = await verifyFinding(doc, { sourceChunkId, category: input.category, severity: 'LOW', quote: input.quote,
      explanationTr: 'Açıkça sağlanan metne karşı kaynak alıntısı doğrulaması.', reasonTr: 'Bu araç anlamsal veya hukuki doğruluk onayı vermez.' },
      input.expectedDocumentHash ?? doc.contentHash, new Set(doc.sourceChunks.map(c => c.chunkId)));
    return output(evidenceOutputSchema.parse({ documentId: doc.documentId, documentHash: doc.contentHash, sourceChunkId,
      verified: !!verification.accepted, ...verification }));
  });
  server.registerTool('analyze_document', {
    description: 'Analyze short explicitly supplied text with existing local Qwen/GPU pipeline. Supplied excerpt coverage remains UNKNOWN and a complete-contract score is withheld.',
    inputSchema: suppliedDocumentSchema, outputSchema: analysisOutputSchema,
  }, async input => {
    if (busy) throw Error('One local analysis at a time'); busy = true;
    try {
      const doc = await suppliedDocument(input); await prepareGpuModel();
      const report = await analyzeDocument(doc, { timeoutMs: 180_000, request: requestRiskBatch });
      return output(analysisOutputSchema.parse({ report, disclaimer: 'Bu uygulama hukuki tavsiye vermez.' }));
    } finally { busy = false; }
  });
  return server;
}
if (process.env.CLAUSEGUARD_MCP_LIBRARY !== '1') {
  console.error('ClauseGuard MCP: local stdio; no browser/file tools.');
  serveStdio(createClauseGuardServer);
}
