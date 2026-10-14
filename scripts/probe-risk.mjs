import { loadRisk } from './load-risk.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const { RISK_JSON_SCHEMA, proposedResponseSchema, RISK_SYSTEM_PROMPT } = await loadRisk();
const directory = 'docs/evidence/p2-probe'; mkdirSync(directory, { recursive: true });
const save = (name, value) => writeFileSync(`${directory}/${name}`, JSON.stringify(value, null, 2));
const model = 'qwen3.5:9b-q4_K_M';
const load = await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, think: false, keep_alive: '10m', options: { num_ctx: 8192 } }) });
if (!load.ok) throw new Error(`Preload HTTP ${load.status}`);
const samples = []; let busy = false;
const sample = async () => { if (busy) return; busy = true; try { samples.push({ at: new Date().toISOString(), gpu: execFileSync('nvidia-smi', ['--query-gpu=memory.used,utilization.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8' }).trim(), processor: execFileSync(resolve('.local/ollama/ollama.exe'), ['ps'], { encoding: 'utf8' }).trim(), resident: await (await fetch('http://127.0.0.1:11434/api/ps')).json() }); } finally { busy = false; } };
await sample(); const interval = setInterval(() => void sample(), 750);
try {
  const request = { model, stream: false, think: false, format: RISK_JSON_SCHEMA, options: { num_ctx: 8192, temperature: 0, num_predict: 1536 },
    messages: [{ role: 'system', content: RISK_SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ sourceData: [{ sourceChunkId: 'probe-renewal', text: 'Your subscription renews automatically each month. Renewal reminders are not sent. You must cancel at least thirty days before renewal to avoid charges.' }] }) }] };
  save('request.json', request); const started = performance.now();
  const response = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(90_000) });
  const body = await response.json(); save('response.json', body);
  const parsed = proposedResponseSchema.safeParse(JSON.parse(body.message?.content));
  await sample();
  const report = { measuredAt: new Date().toISOString(), httpStatus: response.status, schemaValid: parsed.success, parsed: parsed.success ? parsed.data : parsed.error.message, wallMs: performance.now() - started, samples,
    fullGpu: samples.length > 1 && samples.every(sample => /100% GPU/.test(sample.processor) && sample.resident.models.some(model => model.context_length === 8192 && model.size > 0 && model.size_vram >= model.size)), noToolCalls: !body.message?.tool_calls?.length };
  save('probe.json', report); console.log(JSON.stringify(report, null, 2));
  if (!response.ok || !parsed.success || !report.fullGpu || !report.noToolCalls) process.exitCode = 1;
} finally { clearInterval(interval); save('samples.json', samples); }
