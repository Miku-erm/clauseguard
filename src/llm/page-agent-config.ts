import { buildResponseGrammar } from './macro-schema';

/** Use Ollama's supported output grammar with the unchanged Alibaba macro. */
export function localPageAgentRequest(body: Record<string, unknown>): Record<string, unknown> {
  const { enable_thinking: _dashScopeThinking, ...localBody } = body;
  const tools = localBody.tools as { type?: unknown; function?: { name?: unknown; parameters?: unknown } }[] | undefined;
  if (!Array.isArray(tools) || tools.length !== 1 || tools[0]?.type !== 'function' || tools[0].function?.name !== 'AgentOutput') {
    throw new Error('Only the actual Alibaba AgentOutput macro is supported');
  }
  const schema = buildResponseGrammar(tools[0].function.parameters);
  // Single P0.1 behavior change: constrain raw model JSON using the exact
  // action schemas, requiring the existing reflection-before-action fields.
  // The official normalizer and runtime tool guards still act.
  return { ...localBody, stream: false, reasoning_effort: 'none', temperature: 0.2, presence_penalty: 0, max_tokens: 1536,
    response_format: { type: 'json_schema', json_schema: { name: 'AgentOutput', strict: true, schema } } };
}
