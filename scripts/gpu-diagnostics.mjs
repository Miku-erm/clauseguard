import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectRuntime } from './lib/runtime.mjs';

const model = 'qwen3.5:9b-q4_K_M';
const base = 'http://127.0.0.1:11434';
const local = resolve('.local/ollama/ollama.exe');
const ollama = existsSync(local) ? local : 'ollama';
const outputDirectory = process.env.CLAUSEGUARD_EVIDENCE_DIR ?? 'docs/evidence';
const output = resolve(outputDirectory);
mkdirSync(output, { recursive: true });
const command = (exe, args) => {
  try { return execFileSync(exe, args, { encoding: 'utf8', timeout: 15_000 }).trim(); }
  catch (e) { return `ERROR: ${e.message}`; }
};
const save = (name, data) => writeFileSync(resolve(output, name), JSON.stringify(data, null, 2));
const api = async (path, body) => {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(600_000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${await response.text()}`);
  return response.json();
};

const environment = {
  measuredAt: new Date().toISOString(),
  nvidiaSmi: command('nvidia-smi', []),
  gpu: command('nvidia-smi', ['--query-gpu=name,driver_version,memory.total,memory.used,memory.free', '--format=csv,noheader,nounits']),
  ollamaVersion: command(ollama, ['--version']),
  runtime: inspectRuntime(ollama),
  models: command(ollama, ['list']),
  listener: command('powershell', ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 11434 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json']),
  ram: command('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory']),
};
save('environment.json', environment);
const results = [];
try {
  if (environment.runtime.status !== 'PASS') throw new Error(`Ollama CLI ${environment.runtime.kind}: ${environment.runtime.error}`);
  const tags = await api('/api/tags');
  if (!tags.models.some(m => m.name === model)) throw new Error(`Missing authorized model ${model}; no automatic substitute`);
  save('model-show.json', await api('/api/show', { model }));
  if (process.argv.includes('--inspect')) { console.log(JSON.stringify(environment, null, 2)); process.exit(0); }
  const contextArg = process.argv.find(arg => arg.startsWith('--contexts='));
  const contexts = contextArg ? contextArg.split('=')[1].split(',').map(Number) : [4096, 8192, 16384];
  if (contexts.some(n => ![4096, 8192, 16384].includes(n))) throw new Error('Supported experiments: 4096,8192,16384 only');
  for (const context of contexts) {
    await api('/api/generate', { model, keep_alive: 0 });
    const samples = [];
    let sampling = false;
    const sample = async () => {
      if (sampling) return;
      sampling = true;
      try {
        samples.push({ at: new Date().toISOString(),
          gpu: command('nvidia-smi', ['--query-gpu=memory.used,memory.total,utilization.gpu', '--format=csv,noheader,nounits']),
          processor: command(ollama, ['ps']),
          resident: await api('/api/ps') });
      } catch (e) { samples.push({ error: String(e) }); }
      finally { sampling = false; }
    };
    const repetitions = context === 4096 ? 24 : context === 8192 ? 100 : 240;
    const prompt = 'BEGIN_MARKER_CLAUSEGUARD. Read these fictional legal clauses.\n' +
      Array.from({ length: repetitions }, (_, i) => `Clause ${i + 1}: We retain service records for thirty days. We may share anonymized usage data with analytics partners. Customers may cancel renewal in account settings before the next billing date.\n`).join('') +
      '\nEND_MARKER_CLAUSEGUARD. FIRST quote both exact beginning and ending marker names, then write a detailed numbered explanation of privacy, renewal, retention, consent and cancellation implications, at least 700 words. Do not use tools.';
    const started = performance.now();
    await sample();
    const interval = setInterval(() => void sample(), 750);
    let data;
    try {
      data = await api('/api/generate', { model, prompt, stream: false, think: false, keep_alive: '10m',
        options: { num_ctx: context, num_predict: 512, temperature: 0, seed: 42 } });
      const loaded = samples.filter(s => s.processor?.includes(model));
      const gpuSamples = loaded.map(s => s.gpu.split(',').map(Number));
      const cpuOnly = loaded.some(s => /100% CPU/.test(s.processor));
      const fullGpu = loaded.length > 1 && loaded.every(s => /100% GPU/.test(s.processor));
      const peakUtil = Math.max(0, ...gpuSamples.map(s => s[2]));
      const truncated = data.prompt_eval_count + data.eval_count >= context;
      const result = {
        context, status: cpuOnly ? 'FAIL' : fullGpu && peakUtil > 0 ? 'PASS' : loaded.length > 0 ? 'DEGRADED' : 'BLOCKED',
        promptCharacters: prompt.length, promptTokens: data.prompt_eval_count, generatedTokens: data.eval_count,
        generationTokensPerSecond: data.eval_count / (data.eval_duration / 1e9),
        promptTokensPerSecond: data.prompt_eval_count / (data.prompt_eval_duration / 1e9),
        loadSeconds: data.load_duration / 1e9, totalSeconds: data.total_duration / 1e9,
        wallSeconds: (performance.now() - started) / 1000,
        peakVramMiB: Math.max(0, ...gpuSamples.map(s => s[0])), peakGpuUtilizationPercent: peakUtil,
        residency: loaded.at(-1)?.processor, modelMemory: loaded.at(-1)?.resident,
        contextTruncationSuspected: truncated,
        beginMarkerReturned: data.response.includes('BEGIN_MARKER_CLAUSEGUARD'),
        endMarkerReturned: data.response.includes('END_MARKER_CLAUSEGUARD'),
        outputLimitReached: data.done_reason === 'length',
        samples,
      };
      results.push(result);
      if (result.status === 'FAIL' || result.status === 'BLOCKED') process.exitCode = 1;
      save(`context-${context}.json`, { ...result, nativeResponse: data });
      console.log(JSON.stringify({ ...result, samples: `${samples.length} samples`, modelMemory: undefined }, null, 2));
    } catch (e) {
      const result = { context, status: 'FAIL', error: String(e), samples };
      process.exitCode = 1;
      results.push(result); save(`context-${context}.json`, result); console.error(String(e));
    } finally { clearInterval(interval); }
  }
} catch (e) { save('diagnostic-error.json', { status: 'BLOCKED', error: String(e) }); throw e; }
finally {
  save('gpu-benchmarks.json', { measuredAt: new Date().toISOString(), model, environment, results });
  const operational = results.find(r => r.context === 8192);
  mkdirSync(resolve('public'), { recursive: true });
  writeFileSync(resolve('public/gpu-verification.json'), JSON.stringify({
    measuredAt: new Date().toISOString(), model, context: 8192,
    status: operational?.status ?? 'BLOCKED', residency: operational?.residency ?? null,
    peakGpuUtilizationPercent: operational?.peakGpuUtilizationPercent ?? null,
    peakVramMiB: operational?.peakVramMiB ?? null,
    evidence: `${outputDirectory.replaceAll('\\', '/')}/gpu-benchmarks.json`,
    note: 'Historical host measurements; browser cannot read GPU statistics. Rerun diagnostics when configuration changes.',
  }, null, 2));
}
