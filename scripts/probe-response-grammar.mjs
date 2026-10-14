// Candidate B: change only which existing macro fields the response grammar
// requires. These real inference probes never execute model actions.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PageAgentCore } from '@page-agent/core';
import { z } from 'zod/v4';
const output = 'docs/evidence/p0.1-reflection-probes';
mkdirSync(output, { recursive: true });
const requests = JSON.parse(readFileSync('docs/evidence/p0.1-baseline/page-agent-network.json', 'utf8')).filter(item => item.body?.tools);
const agent = new PageAgentCore({ pageController: { dispose() {} }, baseURL: 'http://127.0.0.1:11434/v1', model: 'qwen3.5:9b-q4_K_M' });
for (const name of agent.tools.keys()) if (!['done', 'click_element_by_index', 'scroll'].includes(name)) agent.tools.delete(name);
const validator = z.object({ evaluation_previous_goal: z.string().optional(), memory: z.string().optional(), next_goal: z.string().optional(),
  action: z.union([...agent.tools].map(([name, tool]) => z.object({ [name]: tool.inputSchema }))) });
const summaries = [];
for (const [state, request] of [['hidden', requests.find(item => !item.body.messages[1].content.includes('We may share anonymized usage data'))],
  ['expanded', requests.find(item => item.body.messages[1].content.includes('We may share anonymized usage data'))]]) {
  for (const seed of [42, 43]) {
    const schema = { ...request.body.tools[0].function.parameters,
      required: ['evaluation_previous_goal', 'memory', 'next_goal', 'action'] };
    const body = { ...request.body, seed,
      response_format: { type: 'json_schema', json_schema: { name: 'AgentOutput', strict: true, schema } } };
    const start = performance.now();
    const response = await fetch('http://127.0.0.1:11434/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const data = await response.json();
    let args;
    try { args = JSON.parse(data.choices?.[0]?.message?.content); } catch {}
    const summary = { state, seed, http: response.status, durationSeconds: (performance.now() - start) / 1000,
      schemaValid: validator.safeParse(args).success, action: args?.action,
      nativeToolCalls: data.choices?.[0]?.message?.tool_calls?.length ?? 0, finishReason: data.choices?.[0]?.finish_reason,
      contextUsage: data.usage, resident: await (await fetch('http://127.0.0.1:11434/api/ps')).json() };
    summaries.push(summary);
    writeFileSync(`${output}/${state}-${seed}.json`, JSON.stringify({ ...summary, request: body, response: data }, null, 2));
    console.log(JSON.stringify(summary));
  }
}
writeFileSync(`${output}/summary.json`, JSON.stringify({ measuredAt: new Date().toISOString(), summaries,
  note: 'Only response grammar required-fields changed relative to candidate A. No action execution.' }, null, 2));
agent.dispose();
