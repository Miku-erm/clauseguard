import { loadRisk } from './load-risk.mjs';
import { JSDOM } from 'jsdom';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const risk = await loadRisk(); const directory = process.env.CLAUSEGUARD_RISK_EVIDENCE_DIR ?? 'docs/evidence/p2-model'; mkdirSync(directory, { recursive: true });
const save = (name, data) => writeFileSync(`${directory}/${name}`, JSON.stringify(data, null, 2));
const definitions = JSON.parse(readFileSync('fixtures/p2/scenarios.json', 'utf8'));
definitions.push({ name: 'long', expectedCategories: ['AUTOMATIC_RENEWAL', 'THIRD_PARTY_DATA_SHARING'], allowedCategories: ['AUTOMATIC_RENEWAL', 'THIRD_PARTY_DATA_SHARING', 'DIFFICULT_CANCELLATION_OR_REFUND', 'TRACKING_AND_PROFILING'], expectedUnresolved: false });
const network = []; const samples = []; const results = []; let sampling = false;
const fetcher = async (url, init) => {
  const response = await fetch(url, init);
  if (String(url).endsWith('/api/chat')) {
    const body = await response.clone().json(); let schemaValid = false; try { schemaValid = risk.proposedResponseSchema.safeParse(JSON.parse(body.message.content)).success; } catch {}
    network.push({ at: new Date().toISOString(), request: JSON.parse(init.body), status: response.status, response: body, schemaValid });
  }
  return response;
};
const sample = async () => { if (sampling) return; sampling = true; try {
  samples.push({ at: new Date().toISOString(), gpu: execFileSync('nvidia-smi', ['--query-gpu=memory.used,memory.total,utilization.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8' }).trim(), processor: execFileSync(resolve('.local/ollama/ollama.exe'), ['ps'], { encoding: 'utf8' }).trim(), resident: await (await fetch('http://127.0.0.1:11434/api/ps')).json() });
} catch (error) { samples.push({ error: String(error) }); } finally { sampling = false; } };
await risk.prepareGpuModel(); await sample(); const timer = setInterval(() => void sample(), 750); let failure;
try {
  for (const definition of definitions) {
    const dom = new JSDOM(readFileSync(`fixtures/p2/${definition.name}.html`, 'utf8'), { url: `http://127.0.0.1:4173/p2/${definition.name}.html` });
    const source = (await risk.extractDocuments(dom.window.document)).documents[0];
    if (source.extraction.status !== 'COMPLETE') throw new Error(`${definition.name} source not complete`);
    const requestStart = network.length; const sampleStart = samples.length;
    const report = await risk.analyzeDocument(source, { request: (batch, signal) => risk.requestRiskBatch(batch, signal, fetcher) });
    const categories = report.findings.map(finding => finding.category);
    const missed = definition.expectedCategories.filter(category => !categories.includes(category));
    const falsePositives = report.findings.filter(finding => !definition.allowedCategories.includes(finding.category));
    const severityConcerns = report.findings.filter(finding => definition.expectedCategories.includes(finding.category) && finding.severity === 'LOW');
    const quoteMismatches = report.findings.filter(finding => { const chunk = source.sourceChunks.find(chunk => chunk.chunkId === finding.sourceChunkId); return !chunk || chunk.text.slice(finding.evidence.start, finding.evidence.end) !== finding.quote; });
    const requests = network.slice(requestStart);
    const item = { name: definition.name, expectations: definition, source: { documentId: source.documentId, hash: source.contentHash, chunks: source.sourceChunks.length, characters: source.extraction.extractedCharacterCount, extractionStatus: source.extraction.status }, report, missed, falsePositives, severityConcerns, quoteMismatches, requests: requests.length, schemaValidResponses: requests.filter(request => request.schemaValid).length, invalidResponses: requests.filter(request => !request.schemaValid).length, gpuSamples: samples.slice(sampleStart) };
    results.push(item); save(`${definition.name}.json`, item);
    console.log(JSON.stringify({ name: item.name, status: report.status, score: report.score, alarm: report.alarmLevel, findings: categories, unresolved: report.unresolvedIssues, rejected: report.rejectedFindingCount, missed, falsePositiveCount: falsePositives.length, durationMs: report.durationMs, calls: requests.length }));
    dom.window.close();
  }
  for (const coverage of ['PARTIAL', 'UNKNOWN']) {
    const dom = new JSDOM(readFileSync('fixtures/p2/injection.html', 'utf8'), { url: coverage === 'UNKNOWN' ? 'https://example.test/subscription' : 'http://127.0.0.1:4173/p2/injection.html' });
    if (coverage === 'PARTIAL') dom.window.document.getElementById('clause-2').remove();
    const source = (await risk.extractDocuments(dom.window.document)).documents[0]; const report = await risk.analyzeDocument(source, { request: (batch, signal) => risk.requestRiskBatch(batch, signal, fetcher) });
    const item = { name: coverage.toLowerCase(), actualExtraction: source.extraction.status, report };
    results.push(item); save(`${item.name}.json`, item); if (report.score !== null || source.extraction.status !== coverage) throw new Error('Coverage incorrectly scored'); dom.window.close();
  }
} catch (error) { failure = String(error); console.error(failure); }
finally {
  clearInterval(timer); await sample();
  const ordinary = results.filter(item => item.expectations); const loaded = samples.filter(sample => sample.processor?.includes('qwen3.5:9b-q4_K_M'));
  const fullGpu = loaded.length > 1 && loaded.every(sample => /100% GPU/.test(sample.processor) && sample.resident.models.some(model => model.context_length === 8192 && model.size > 0 && model.size_vram >= model.size));
  const missedCount = ordinary.reduce((sum, item) => sum + item.missed.length, 0); const falsePositiveCount = ordinary.reduce((sum, item) => sum + item.falsePositives.length, 0);
  const timing = ordinary.flatMap(item => item.report.coverage.batches.flatMap(batch => batch.timings));
  const summary = { measuredAt: new Date().toISOString(), status: failure ? 'FAIL' : missedCount || falsePositiveCount || ordinary.some(item => item.invalidResponses || item.quoteMismatches.length || (item.expectations.expectedUnresolved ? !item.report.unresolvedIssues.length : item.report.status !== 'COMPLETE')) ? 'DEGRADED' : fullGpu ? 'PASS' : 'FAIL', failure,
    scenarios: results.map(item => ({ name: item.name, reportStatus: item.report.status, score: item.report.score, findings: item.report.findings.length, rejected: item.report.rejectedFindingCount, durationMs: item.report.durationMs, calls: item.requests, missed: item.missed, falsePositives: item.falsePositives?.length })),
    actualModelCalls: network.length, schemaValidResponses: network.filter(item => item.schemaValid).length, invalidResponses: network.filter(item => !item.schemaValid).length, retryCount: ordinary.reduce((sum, item) => sum + item.report.coverage.batches.reduce((sum, batch) => sum + Math.max(0, batch.attempts - 1), 0), 0),
    acceptedEvidence: results.reduce((sum, item) => sum + item.report.findings.length, 0), rejectedEvidence: results.reduce((sum, item) => sum + item.report.rejectedFindingCount, 0), missedCount, falsePositiveCount,
    fullGpu, sampleCount: loaded.length, peakVramMiB: Math.max(...loaded.map(sample => Number(sample.gpu.split(',')[0]))), peakComputePercent: Math.max(...loaded.map(sample => Number(sample.gpu.split(',')[2]))),
    totalPromptMs: timing.reduce((sum, timing) => sum + timing.promptMs, 0), totalGenerationMs: timing.reduce((sum, timing) => sum + timing.generationMs, 0), totalInferenceMs: timing.reduce((sum, timing) => sum + timing.totalMs, 0), generatedTokens: timing.reduce((sum, timing) => sum + timing.generatedTokens, 0),
    generationTokensPerSecond: timing.reduce((sum, timing) => sum + timing.generatedTokens, 0) / (timing.reduce((sum, timing) => sum + timing.generationMs, 0) / 1000), maxPromptTokens: Math.max(...timing.map(timing => timing.promptTokens)), noTools: network.every(item => !item.request.tools && !item.response.message?.tool_calls?.length) };
  save('summary.json', summary); save('network.json', network); save('gpu-samples.json', samples); console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'PASS') process.exitCode = 1;
}
