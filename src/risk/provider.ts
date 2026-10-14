import { z } from 'zod/v4';
import { CONTEXT, MODEL, OLLAMA_ORIGIN } from '../core/config';
import { OUTPUT_TOKENS, estimatePromptTokens, type AnalysisBatch } from './batching';
import { RISK_SYSTEM_PROMPT } from './prompt';
import { proposedResponseSchema, RISK_JSON_SCHEMA, timingSchema, type ProposedResponse } from './schema';
const metric = z.number().nonnegative();
const nativeSchema = z.object({ model: z.literal(MODEL), done: z.literal(true), done_reason: z.literal('stop'),
  message: z.object({ role: z.literal('assistant'), content: z.string().max(24_000), tool_calls: z.array(z.unknown()).max(0).optional() }),
  prompt_eval_count: metric.int(), eval_count: metric.int(), prompt_eval_duration: metric, eval_duration: metric, total_duration: metric, load_duration: metric,
});
export class InvalidRiskResponse extends Error {}
export interface AnalysisResponse { proposal: ProposedResponse; timing: z.infer<typeof timingSchema> }
export const MAX_OUTPUT_TOKENS = 3072;
export function outputTokensForBatch(batch: AnalysisBatch): number {
  return batch.estimatedPromptTokens + MAX_OUTPUT_TOKENS <= CONTEXT ? MAX_OUTPUT_TOKENS : batch.estimatedPromptTokens + 2048 <= CONTEXT ? 2048 : OUTPUT_TOKENS;
}
export function buildRiskRequest(batch: AnalysisBatch) {
  if (estimatePromptTokens(batch.userContent) !== batch.estimatedPromptTokens || batch.estimatedPromptTokens + OUTPUT_TOKENS > CONTEXT) throw new Error('Analysis context budget exceeded; refusing without truncation');
  const outputTokens = outputTokensForBatch(batch);
  return { model: MODEL, stream: false, think: false, keep_alive: '10m', format: RISK_JSON_SCHEMA,
    messages: [{ role: 'system', content: RISK_SYSTEM_PROMPT }, { role: 'user', content: batch.userContent }],
    options: { num_ctx: CONTEXT, temperature: 0, num_predict: outputTokens } };
}
export function decodeRiskResponse(body: unknown, wallMs: number, outputTokens: number = OUTPUT_TOKENS): AnalysisResponse {
  try {
    // Reserve 3072, 2048 or 1536 without exceeding the complete input/context budget.
    if (![1536, 2048, MAX_OUTPUT_TOKENS].includes(outputTokens)) throw new Error('Unknown output reservation');
    if (body && typeof body === 'object' && 'done_reason' in body && body.done_reason === 'length') throw new InvalidRiskResponse('OUTPUT_LIMIT_REACHED: incomplete response rejected without repair');
    const native = nativeSchema.parse(body);
    if (native.prompt_eval_count + outputTokens > CONTEXT || native.eval_count >= outputTokens) throw new Error('Output/context budget reached');
    const proposal = proposedResponseSchema.parse(JSON.parse(native.message.content));
    return { proposal, timing: timingSchema.parse({ wallMs, promptTokens: native.prompt_eval_count, generatedTokens: native.eval_count,
      promptMs: native.prompt_eval_duration / 1e6, generationMs: native.eval_duration / 1e6, totalMs: native.total_duration / 1e6, loadMs: native.load_duration / 1e6,
      tokensPerSecond: native.eval_duration > 0 ? native.eval_count * 1e9 / native.eval_duration : 0 }) };
  } catch (error) { if (error instanceof InvalidRiskResponse) throw error; throw new InvalidRiskResponse('Structured analysis response failed schema, completion or context validation'); }
}
export async function verifyAnalysisResidency(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<void> {
  const response = await fetcher(`${OLLAMA_ORIGIN}/api/ps`, { signal, redirect: 'error' });
  if (!response.ok) throw new Error('Could not verify analysis GPU residency');
  const body = await response.json() as { models?: Array<{ name: string; context_length: number; size: number; size_vram: number }> };
  if (!body.models?.some(model => model.name === MODEL && model.context_length === CONTEXT && model.size > 0 && model.size_vram >= model.size)) throw new Error('Analysis requires verified full GPU residency at 8192; CPU/mixed execution refused');
}
export async function requestRiskBatch(batch: AnalysisBatch, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<AnalysisResponse> {
  const request = buildRiskRequest(batch); const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(90_000)]);
  await verifyAnalysisResidency(fetcher, boundedSignal); const started = performance.now();
  const response = await fetcher(`${OLLAMA_ORIGIN}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request), signal: boundedSignal, redirect: 'error' });
  if (!response.ok) throw new Error(`Local analysis provider returned HTTP ${response.status}`);
  const text = await response.text(); if (text.length > 80_000) throw new InvalidRiskResponse('Analysis response exceeds size limit');
  let raw: unknown; try { raw = JSON.parse(text); } catch { throw new InvalidRiskResponse('Analysis provider returned malformed JSON'); }
  const decoded = decodeRiskResponse(raw, performance.now() - started, request.options.num_predict);
  if (decoded.timing.promptTokens > batch.estimatedPromptTokens) throw new InvalidRiskResponse('Measured prompt exceeded conservative estimate; analysis rejected');
  await verifyAnalysisResidency(fetcher, boundedSignal); return decoded;
}
