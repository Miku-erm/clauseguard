import { z } from 'zod/v4';
import { isFixtureUrl, MODEL } from '../core/config';
import { buildResponseGrammar } from '../llm/macro-schema';
import { fixtureExpectation } from '../extraction/fixture-expectations';

export const popupCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('STATUS') }), z.strictObject({ type: z.literal('START_TEST') }),
  z.strictObject({ type: z.literal('START_SCAN') }), z.strictObject({ type: z.literal('CANCEL_SCAN') }), z.strictObject({ type: z.literal('CLEAR_SCAN') }),
  z.strictObject({ type: z.literal('START_ANALYSIS') }), z.strictObject({ type: z.literal('CANCEL_ANALYSIS') }),
]);
export const runCommandSchema = z.strictObject({ type: z.literal('RUN_AGENT'), sessionId: z.string().uuid() });
export interface Sender { id?: string; url?: string; origin?: string; frameId?: number; documentId?: string; tab?: { id?: number; url?: string } }
export function isPopupSender(sender: Sender, runtimeId: string, popupUrl: string): boolean {
  return sender.id === runtimeId && sender.url === popupUrl;
}
export interface Session {
  id: string; tabId: number; expiresAt: number; requests: number; busy: boolean; documentId?: string; authorizedUrl?: string; frameId?: number;
}
export function authorizeSession(session: Session | undefined, sender: Sender, runtimeId: string, now = Date.now()): Session {
  if (!session || session.expiresAt <= now || sender.id !== runtimeId || sender.tab?.id !== session.tabId ||
      sender.frameId !== (session.frameId ?? 0) || !(session.authorizedUrl ? !!fixtureExpectation(session.authorizedUrl)?.controls.length && sender.url === session.authorizedUrl : isFixtureUrl(sender.url)) ||
      (sender.origin !== undefined && sender.origin !== 'http://127.0.0.1:4173') ||
      (session.documentId !== undefined && session.documentId !== sender.documentId)) throw new Error('Unauthorized or expired fixture session');
  if (session.requests >= 14 || session.busy) throw new Error('Session request limit or concurrent request rejected');
  return session;
}

export const llmBodySchema = z.strictObject({
  model: z.literal(MODEL),
  messages: z.array(z.strictObject({ role: z.enum(['system', 'user']), content: z.string().max(24_000) })).length(2),
  tools: z.array(z.strictObject({
    type: z.literal('function'), function: z.strictObject({ name: z.literal('AgentOutput'), description: z.string().optional(), parameters: z.record(z.string(), z.unknown()) }),
  })).length(1),
  parallel_tool_calls: z.literal(false),
  tool_choice: z.union([z.literal('required'), z.strictObject({ type: z.literal('function'), function: z.strictObject({ name: z.literal('AgentOutput') }) })]),
  stream: z.literal(false), reasoning_effort: z.literal('none'), temperature: z.literal(0.2), presence_penalty: z.literal(0), max_tokens: z.literal(1536),
  response_format: z.strictObject({ type: z.literal('json_schema'), json_schema: z.strictObject({
    name: z.literal('AgentOutput'), strict: z.literal(true), schema: z.record(z.string(), z.unknown()),
  }) }),
});
export const llmMessageSchema = z.strictObject({ requestId: z.string().uuid(), body: z.string().max(52_000) });
export function validateLlmBody(body: string): string {
  const parsed = llmBodySchema.parse(JSON.parse(body));
  if (new TextEncoder().encode(body).length > 52_000) throw new Error('Request too large; refusing instead of truncating');
  const schemaText = JSON.stringify(parsed.tools);
  if (/execute_javascript|input_text|select_dropdown_option|ask_user/.test(schemaText)) throw new Error('Unsafe tool schema rejected');
  const macro = buildResponseGrammar(parsed.tools[0]!.function.parameters);
  if (JSON.stringify(parsed.response_format.json_schema.schema) !== JSON.stringify(macro)) {
    throw new Error('Response grammar must exactly match the restricted AgentOutput grammar');
  }
  return JSON.stringify(parsed);
}
