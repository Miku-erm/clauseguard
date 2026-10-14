import { readFileSync, writeFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const current = read('docs/evidence/p1-verified/integration.json');
const regression = read('docs/evidence/p1-p0.1-verified/browser-integration.json');
const normal = current.cases.filter(item => !item.fault);
const fast = normal.filter(item => item.result.path === 'FAST');
const slow = normal.filter(item => item.result.path === 'SLOW');
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const gpu = slow.flatMap(item => item.gpuSamples).filter(sample => sample.processor?.includes('qwen3.5:9b-q4_K_M'));
const steps = slow.flatMap(item => item.result.discovery.steps);
const summary = {
  phase: 'P1', status: current.status, measuredAt: current.measuredAt, failures: current.failures,
  fast: { attempts: fast.length, inferenceRequests: fast.reduce((sum, item) => sum + item.inferenceRequests, 0), providerCalls: fast.reduce((sum, item) => sum + item.result.providerCalls, 0),
    agentInvocations: fast.filter(item => item.result.agentInvoked).length, meanEngineMs: mean(fast.map(item => item.result.durationMs)), minEngineMs: Math.min(...fast.map(item => item.result.durationMs)), maxEngineMs: Math.max(...fast.map(item => item.result.durationMs)),
    outcomes: fast.map(item => ({ fixture: item.name, state: item.result.state, coverage: item.result.documents.map(document => document.extraction.status), engineMs: item.result.durationMs, wallMs: item.wallMs })) },
  slow: { attempts: slow.length, successes: slow.filter(item => item.result.state === 'READY' && item.result.discovery.success && !item.dom.collapsedAfter && !item.dom.hiddenPolicyRegions).length,
    providerCalls: slow.reduce((sum, item) => sum + item.result.providerCalls, 0), toolCalls: slow.reduce((sum, item) => sum + item.result.discovery.toolCalls, 0), failedToolCalls: slow.reduce((sum, item) => sum + item.result.discovery.failedToolCalls, 0), retries: slow.reduce((sum, item) => sum + item.result.discovery.retries, 0),
    meanEngineMs: mean(slow.map(item => item.result.durationMs)), outcomes: slow.map(item => ({ fixture: item.name, engineMs: item.result.durationMs, agentMs: item.result.discovery.durationMs, toolCalls: item.result.discovery.toolCalls, providerCalls: item.result.providerCalls, initialControls: item.dom.initialCollapsed, openAfter: item.dom.initialCollapsed - item.dom.collapsedAfter })) },
  exactSourceChecks: normal.flatMap(item => item.sourceChecks).length, exactSourceMismatches: normal.flatMap(item => item.sourceChecks).filter(check => !check.matches).length,
  longDocument: current.cases.find(item => item.name === 'long').result.documents.map(document => ({ chunks: document.sourceChunks.length, characters: document.extraction.extractedCharacterCount, finalClause: document.sourceChunks.at(-1).text })),
  gpu: { sampleCount: gpu.length, fullGpuThroughout: gpu.length > 1 && gpu.every(sample => sample.processor.includes('100% GPU') && sample.resident.models.some(model => model.name === 'qwen3.5:9b-q4_K_M' && model.context_length === 8192 && model.size_vram >= model.size && model.size > 0)),
    peakBoardVramMiB: Math.max(...gpu.map(sample => Number(sample.gpu.split(',')[0]))), peakComputePercent: Math.max(...gpu.map(sample => Number(sample.gpu.split(',')[2]))), modelMemoryBytes: [...new Set(gpu.flatMap(sample => sample.resident.models.filter(model => model.name === 'qwen3.5:9b-q4_K_M').map(model => model.size)))],
    promptTokens: steps.reduce((sum, step) => sum + step.promptTokens, 0), generatedTokens: steps.reduce((sum, step) => sum + step.completionTokens, 0), maximumStepTokens: Math.max(...steps.map(step => step.promptTokens + step.completionTokens)),
    note: 'Inference TPS and native load duration were not rebenchmarked in P1; prior P0.1 8192 measurement remains historical.' },
  faults: current.cases.filter(item => item.fault).map(item => ({ fault: item.fault, injected: item.injected, state: item.result.state, engineMs: item.result.durationMs, failedToolCalls: item.result.discovery?.failedToolCalls, hiddenPolicyRegions: item.dom.hiddenPolicyRegions, warnings: item.result.warnings })),
  regression: { status: regression.status, ordinary: regression.attempts.filter(item => !item.injectedFault).length, successes: regression.attempts.filter(item => !item.injectedFault && item.result.status === 'PASS').length, faults: regression.attempts.filter(item => item.injectedFault).map(item => ({ status: item.result.status, failedToolCalls: item.result.failedToolCalls, hiddenAfter: item.dom.hiddenAfter })) },
};
writeFileSync('docs/evidence/p1-summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
