/** Inspect, never replace, the real Alibaba-generated macro parameters. */
export function requireMacroParameters(parameters: unknown): Record<string, unknown> {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new Error('AgentOutput schema missing');
  const schema = parameters as Record<string, unknown>;
  const properties = schema.properties as Record<string, unknown> | undefined;
  if (schema.type !== 'object' || !Array.isArray(schema.required) || !schema.required.includes('action') ||
      !properties || typeof properties !== 'object' || !properties.action || typeof properties.action !== 'object') {
    throw new Error('AgentOutput must require an action; refusing an incomplete response grammar');
  }
  return schema;
}

/** Strengthen only optional reflection requirements; keep all real action schemas. */
export function buildResponseGrammar(parameters: unknown): Record<string, unknown> {
  const schema = requireMacroParameters(parameters);
  const properties = schema.properties as Record<string, { type?: unknown }>;
  const reflections = ['evaluation_previous_goal', 'memory', 'next_goal'];
  if (reflections.some(name => properties[name]?.type !== 'string')) {
    throw new Error('Expected the actual Alibaba reflection fields; refusing an unknown macro');
  }
  return { ...schema, required: [...new Set([...reflections, ...(schema.required as string[])])] };
}
