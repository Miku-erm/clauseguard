import { z } from 'zod/v4';

export const stepSchema = z.strictObject({
  name: z.string().max(80), input: z.unknown(), output: z.string().max(4000),
  promptTokens: z.number().nonnegative(), completionTokens: z.number().nonnegative(),
});
export const reportSchema = z.strictObject({
  sessionId: z.string().uuid(), status: z.enum(['PASS', 'FAIL']), agentSuccess: z.boolean(),
  data: z.string().max(4000), durationMs: z.number().nonnegative(),
  initiallyHidden: z.boolean(), policyVisible: z.boolean(), identifiedClause: z.boolean(),
  toolCalls: z.number().int().nonnegative(), failedToolCalls: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(), steps: z.array(stepSchema).max(8),
  invalidToolResponses: z.number().int().nonnegative(),
  activities: z.array(z.record(z.string(), z.unknown())).max(80),
  errors: z.array(z.string().max(4000)).max(20), allowedTools: z.array(z.string()).max(10),
});
export type TestReport = z.infer<typeof reportSchema>;

export function passedDomTask(initiallyHidden: boolean, visible: boolean, data: string, steps: { name: string; output: string }[], success: boolean): boolean {
  return initiallyHidden && visible && success && identifiesClause(data) &&
    steps.some(step => step.name === 'click_element_by_index' && !step.output.includes('❌')) &&
    steps.some(step => step.name === 'done');
}
export function identifiesClause(data: string): boolean {
  return /(?:Data Sharing|Veri Payla[şs][ıi]m[ıi])/i.test(data) && /\b3\b/.test(data) &&
    /(?:analytics|analitik|anonym|anonim|partners|ortak)/i.test(data);
}
