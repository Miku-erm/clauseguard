// Real inference probes only. No DOM operation is executed by this script.
// Requests are replays of the explicitly fictional, fixed loopback fixture.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PageAgentCore } from '@page-agent/core';
import { z } from 'zod/v4';

const model = 'qwen3.5:9b-q4_K_M';
const base = 'http://127.0.0.1:11434';
const output = resolve('docs/evidence/p0.1-probes');
mkdirSync(output, { recursive: true });
const save = (name, data) => writeFileSync(resolve(output, name), JSON.stringify(data, null, 2));
const api = async (path, body) => {
  const start = performance.now();
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    redirect: 'error', signal: AbortSignal.timeout(90_000) });
  const data = await response.json();
  return { status: response.status, durationSeconds: (performance.now() - start) / 1000, data };
};
const inventory = await api('/api/tags');
if (!inventory.data.models.some(item => item.name === model)) throw new Error('Exact authorized model missing; no download or substitute');
await api('/api/generate', { model, stream: false, think: false, keep_alive: '10m', options: { num_ctx: 8192 } });
const resident = await api('/api/ps');
if (!resident.data.models.some(item => item.name === model && item.context_length === 8192 && item.size > 0 && item.size === item.size_vram)) throw new Error('Full GPU 8192 residency required');

// Use actual installed action schemas, with no executable probe DOM controller.
const schemaAgent = new PageAgentCore({ pageController: { dispose() {} }, baseURL: `${base}/v1`, model });
const allowed = new Set(['done', 'click_element_by_index', 'scroll']);
for (const name of schemaAgent.tools.keys()) if (!allowed.has(name)) schemaAgent.tools.delete(name);
const macro = z.object({ evaluation_previous_goal: z.string().optional(), memory: z.string().optional(), next_goal: z.string().optional(),
  action: z.union([...schemaAgent.tools].map(([name, tool]) => z.object({ [name]: tool.inputSchema }))) });
const parsedArguments = text => { try { return JSON.parse(text); } catch { return null; } };
const classify = result => {
  const native = result.choices?.[0]?.message ?? result.message;
  const calls = native?.tool_calls ?? [];
  const callArguments = calls.map(call => ({ name: call.function?.name,
    arguments: typeof call.function?.arguments === 'string' ? parsedArguments(call.function.arguments) : call.function?.arguments }));
  const content = native?.content ?? '';
  const plainJson = parsedArguments(content.trim());
  const match = content.match(/\{[\s\S]*\}/);
  const embeddedJson = match ? parsedArguments(match[0]) : null;
  return {
    toolCallsPresent: calls.length > 0, toolNames: callArguments.map(call => call.name),
    nativeArgumentChecks: callArguments.map(call => ({ name: call.name,
      actionPresent: !!call.arguments?.action, macroSchemaValid: call.name === 'AgentOutput' && macro.safeParse(call.arguments).success })),
    responseFormat: calls.length ? 'native-tool_calls' : plainJson ? 'content-plain-JSON' : embeddedJson ? 'content-embedded-JSON' : 'content-unparseable',
    plainJsonMacroValid: macro.safeParse(plainJson).success,
    embeddedJsonMacroValid: macro.safeParse(embeddedJson).success,
    finishReason: result.choices?.[0]?.finish_reason ?? result.done_reason,
    contextUsage: result.usage ?? { prompt_tokens: result.prompt_eval_count, completion_tokens: result.eval_count },
  };
};
const results = [];
const run = async (name, body, nativeApi = false) => {
  const response = await api(nativeApi ? '/api/chat' : '/v1/chat/completions', body);
  const result = { name, request: body, ...response, classification: classify(response.data),
    resident: (await api('/api/ps')).data,
    ollamaPs: execFileSync(resolve('.local/ollama/ollama.exe'), ['ps'], { encoding: 'utf8' }),
    nvidiaSmi: execFileSync('nvidia-smi', ['--query-gpu=memory.used,utilization.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8' }).trim(),
    note: 'Diagnostic classification only; no tool or DOM action was executed.' };
  save(`${name}.json`, result); results.push(result);
  console.log(JSON.stringify({ name, http: result.status, durationSeconds: result.durationSeconds, ...result.classification }));
  return result;
};

const flatTool = { type: 'function', function: { name: 'Ping', description: 'Return a ping label',
  parameters: { type: 'object', properties: { label: { type: 'string' } }, required: ['label'], additionalProperties: false } } };
const flat = { model, messages: [{ role: 'user', content: 'Reply exactly PONG as plain text. Do not call any function.' }],
  tools: [flatTool], stream: false, reasoning_effort: 'none', temperature: 0, presence_penalty: 0, seed: 19, max_tokens: 128 };
const renderHashes = [];
for (const [label, tool_choice] of [['none', 'none'], ['required', 'required'], ['named', { type: 'function', function: { name: 'Ping' } }],
  ['invalid-name', { type: 'function', function: { name: 'NotRegistered' } }]]) {
  const body = { ...flat, tool_choice };
  const rendered = await api('/v1/chat/completions', { ...body, _debug_render_only: true });
  save(`render-${label}.json`, { request: body, ...rendered });
  const debug = rendered.data._debug_info;
  renderHashes.push({ label, status: rendered.status, hash: createHash('sha256').update(JSON.stringify(debug)).digest('hex'), debugKeys: Object.keys(debug ?? {}) });
  await run(`flat-choice-${label}`, body);
}
await run('flat-none-requested-call', { ...flat, tool_choice: 'none', messages: [{ role: 'user', content: 'Call Ping with label PONG. Do not answer in plain text.' }] });
save('tool-choice-render-comparison.json', renderHashes);

const requests = JSON.parse(readFileSync('docs/evidence/p0.1-baseline/page-agent-network.json', 'utf8')).filter(item => item.body?.tools);
const first = requests.find(item => !item.body.messages[1].content.includes('We may share anonymized usage data'));
const completed = requests.find(item => item.body.messages[1].content.includes('We may share anonymized usage data'));
if (!first || !completed) throw new Error('Actual hidden/expanded fixture request captures required');
for (const [state, captured] of [['hidden', first], ['expanded', completed]]) {
  for (const seed of [42, 43]) {
    const body = { ...captured.body, seed };
    await run(`macro-${state}-baseline-${seed}`, body);
    // Single candidate variable: use the exact official macro JSON schema as
    // Ollama's supported response grammar; keep agent, tool registry and sampler.
    await run(`macro-${state}-schema-${seed}`, { ...body,
      response_format: { type: 'json_schema', json_schema: { name: 'AgentOutput', strict: true, schema: body.tools[0].function.parameters } } });
  }
  const body = captured.body;
  await run(`macro-${state}-native-api`, { model, messages: body.messages, tools: body.tools, stream: false, think: false, keep_alive: '10m',
    options: { num_ctx: 8192, num_predict: body.max_tokens, temperature: body.temperature, presence_penalty: body.presence_penalty, top_p: 1, seed: 42 } }, true);
}
await run('intentional-output-truncation', { ...completed.body, seed: 42, max_tokens: 8 });
save('summary.json', { measuredAt: new Date().toISOString(), model, runtime: (await api('/api/version')).data,
  renderHashes, results: results.map(({ request, data, ...result }) => result),
  note: 'Fixed fictional fixture replays; supported structured output candidate changes only response_format. These probes never execute browser operations.' });
schemaAgent.dispose();
