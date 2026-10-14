import { z } from 'zod/v4';
import { contractDocumentSchema, type ExtractionResult } from '../extraction/schema';
import { llmsDiscoverySchema } from '../extraction/llms-txt';

export const stateSchema = z.enum(['IDLE', 'INSPECTING', 'EXTRACTING', 'DISCOVERING', 'RE_EXTRACTING', 'READY', 'PARTIAL', 'INSUFFICIENT', 'FAILED']);
export type ReflexState = z.infer<typeof stateSchema>;
const transitions: Record<ReflexState, ReflexState[]> = {
  IDLE: ['INSPECTING'], INSPECTING: ['EXTRACTING', 'FAILED'], EXTRACTING: ['READY', 'PARTIAL', 'INSUFFICIENT', 'DISCOVERING', 'FAILED'],
  DISCOVERING: ['RE_EXTRACTING', 'FAILED'], RE_EXTRACTING: ['READY', 'PARTIAL', 'INSUFFICIENT', 'FAILED'], READY: [], PARTIAL: [], INSUFFICIENT: [], FAILED: [],
};
export function transition(from: ReflexState, to: ReflexState): ReflexState {
  if (!transitions[from].includes(to)) throw new Error(`Invalid reflex transition ${from} -> ${to}`);
  return to;
}
export const discoveryReportSchema = z.strictObject({ success: z.boolean(), data: z.string(), durationMs: z.number(),
  toolCalls: z.number().int().nonnegative(), failedToolCalls: z.number().int().nonnegative(), retries: z.number().int().nonnegative(),
  steps: z.array(z.record(z.string(), z.unknown())), activities: z.array(z.record(z.string(), z.unknown())), errors: z.array(z.string()), allowedTools: z.array(z.string()),
});
export type DiscoveryReport = z.infer<typeof discoveryReportSchema>;
export const scanReportSchema = z.strictObject({ sessionId: z.string().uuid(), state: stateSchema, path: z.enum(['FAST', 'SLOW']),
  agentInvoked: z.boolean(), providerCalls: z.number().int().nonnegative(), durationMs: z.number().nonnegative(),
  states: z.array(stateSchema), documents: z.array(contractDocumentSchema), warnings: z.array(z.string()), discovery: discoveryReportSchema.optional(), llmsTxt: llmsDiscoverySchema.optional(),
});
export type ScanReport = z.infer<typeof scanReportSchema>;
interface Dependencies {
  extract: () => Promise<ExtractionResult>; discover?: () => Promise<DiscoveryReport>;
  canDiscover: () => boolean; currentUrl: () => Promise<string>; expectedUrl: string; signal?: AbortSignal; timeoutMs?: number;
}
function terminal(extraction: ExtractionResult): ReflexState {
  if (!extraction.documents.some(document => document.sourceChunks.some(chunk => !chunk.heading && chunk.analysisText.length > 40))) return 'INSUFFICIENT';
  return extraction.ambiguous || extraction.documents.some(document => document.extraction.status === 'PARTIAL' || document.extraction.status === 'FAILED') ? 'PARTIAL' : 'READY';
}
export function needsDiscovery(extraction: ExtractionResult): boolean {
  return !extraction.ambiguous && (terminal(extraction) === 'INSUFFICIENT' || extraction.documents.some(document => document.extraction.coverage.unopenedSections.length > 0 || document.extraction.warnings.some(warning => warning.includes('unopened expandable'))));
}
/** One inspection, at most two extractions and one bounded discovery; no model-based routing. */
export async function runReflex(sessionId: string, dependencies: Dependencies): Promise<ScanReport> {
  const start = performance.now(); const states: ReflexState[] = ['IDLE']; let state: ReflexState = 'IDLE';
  let result: ExtractionResult = { documents: [], warnings: [], ambiguous: false }; let discovery: DiscoveryReport | undefined; let invoked = false;
  const controller = new AbortController();
  const abort = () => controller.abort(dependencies.signal?.reason ?? new Error('Scan cancelled'));
  if (dependencies.signal?.aborted) abort(); else dependencies.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error('Scan deadline exceeded')), dependencies.timeoutMs ?? 175_000);
  const move = (next: ReflexState) => { state = transition(state, next); states.push(state); };
  const bounded = async <T>(operation: () => Promise<T>): Promise<T> => {
    controller.signal.throwIfAborted();
    if (await dependencies.currentUrl() !== dependencies.expectedUrl) throw new Error('Stale page: authorized URL changed');
    let rejectAbort: () => void = () => {};
    const cancelled = new Promise<never>((_, reject) => { rejectAbort = () => reject(controller.signal.reason); controller.signal.addEventListener('abort', rejectAbort, { once: true }); });
    try {
      const value = await Promise.race([operation(), cancelled]); controller.signal.throwIfAborted();
      if (await dependencies.currentUrl() !== dependencies.expectedUrl) throw new Error('Stale page: authorized URL changed');
      return value;
    } finally { controller.signal.removeEventListener('abort', rejectAbort); }
  };
  try {
    move('INSPECTING'); move('EXTRACTING'); result = await bounded(dependencies.extract);
    if (needsDiscovery(result) && dependencies.canDiscover() && dependencies.discover) {
      move('DISCOVERING'); invoked = true; discovery = await bounded(dependencies.discover);
      if (discovery.errors.some(error => error.startsWith('Stale page'))) throw new Error('Stale page or removed approved discovery control');
      move('RE_EXTRACTING'); result = await bounded(dependencies.extract);
      if (!discovery.success) result.warnings.push('Page Agent discovery did not complete successfully; extraction reflects the actual resulting DOM.');
    }
    const final = terminal(result);
    // Completion requires actual agent success on SLOW, not merely a coincidental DOM change.
    move(final === 'READY' && discovery && !discovery.success ? 'PARTIAL' : final);
  } catch (error) { move('FAILED'); result.warnings.push(String(error)); }
  finally { clearTimeout(timeout); dependencies.signal?.removeEventListener('abort', abort); }
  return scanReportSchema.parse({ sessionId, state, path: invoked ? 'SLOW' : 'FAST', agentInvoked: invoked, providerCalls: 0,
    durationMs: performance.now() - start, states, documents: result.documents, warnings: result.warnings, ...(discovery ? { discovery } : {}) });
}
