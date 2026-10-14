// Arithmetic over retained real responses; no model, browser or invented benchmark.
import { readFileSync, writeFileSync } from 'node:fs';
const directory = process.argv[2] ?? 'docs/evidence/p3-model';
const summary = JSON.parse(readFileSync(`${directory}/summary.json`, 'utf8'));
const network = JSON.parse(readFileSync(`${directory}/network.json`, 'utf8'));
const sum = key => network.reduce((total, item) => total + (item.response[key] ?? 0), 0);
const result = { ...summary, allRequests: {
  promptTokens: sum('prompt_eval_count'), generatedTokens: sum('eval_count'), promptMs: sum('prompt_eval_duration') / 1e6,
  generationMs: sum('eval_duration') / 1e6, totalMs: sum('total_duration') / 1e6, loadMs: sum('load_duration') / 1e6,
  generationTokensPerSecond: sum('eval_count') / (sum('eval_duration') / 1e9),
  maxPromptTokens: Math.max(...network.map(item => item.response.prompt_eval_count ?? 0)),
}, note: 'Schema validity and exact quotations do not establish semantic/legal accuracy. All-call timing includes supplemental coverage experiments; scenario summary keeps its original ordinary-only timing.' };
writeFileSync(`${directory}/metrics.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
