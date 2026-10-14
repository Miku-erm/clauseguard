// Summarize saved real measurements; this does not run or simulate verification.
import { readFileSync, writeFileSync } from 'node:fs';
const read = name => JSON.parse(readFileSync(`docs/evidence/${name}`, 'utf8'));
const benchmark = read('gpu-benchmarks.json');
const browser = read('browser-integration.json');
const responses = read('page-agent-responses.json');
const ordinary = browser.attempts.filter(attempt => !attempt.injectedFault);
const faults = browser.attempts.filter(attempt => attempt.injectedFault);
const sum = key => ordinary.reduce((total, attempt) => total + (attempt.result[key] ?? 0), 0);
const summary = {
  generatedAt: new Date().toISOString(),
  sourceMeasurements: { gpu: benchmark.measuredAt, browser: browser.measuredAt },
  contexts: benchmark.results.map(({ samples, nativeResponse, ...measurement }) => ({
    ...measurement, sampleCount: samples.length,
    loadedSampleCount: samples.filter(sample => sample.processor?.includes(benchmark.model)).length,
  })),
  browser: {
    status: browser.status, ordinaryAttempts: ordinary.length,
    passed: ordinary.filter(attempt => attempt.result.status === 'PASS').length,
    completionRate: browser.ordinarySuccessRate,
    validExecutedCalls: sum('toolCalls'), failedExecutedCalls: sum('failedToolCalls'),
    retries: sum('retries'), invalidToolResponses: sum('invalidToolResponses'),
    meanTaskSeconds: sum('durationMs') / ordinary.length / 1000,
    attempts: browser.attempts.map(attempt => ({
      attempt: attempt.attempt, fault: attempt.injectedFault, status: attempt.result.status,
      durationSeconds: attempt.result.durationMs / 1000, calls: attempt.result.toolCalls,
      failedCalls: attempt.result.failedToolCalls, retries: attempt.result.retries,
      invalidToolResponses: attempt.result.invalidToolResponses, dom: attempt.dom,
    })),
    safetyFaultBlocked: faults.every(attempt => attempt.injected && attempt.result.status === 'FAIL' &&
      !attempt.result.agentSuccess && attempt.result.failedToolCalls > 0 && attempt.dom.hiddenAfter && attempt.dom.unrelatedClickCount === '0'),
    rawResponseCountIncludingFault: responses.length,
    nativeToolCallResponses: responses.filter(response => response.body?.choices?.[0]?.message?.tool_calls?.length).length,
    contentOnlyResponses: responses.filter(response => !response.body?.choices?.[0]?.message?.tool_calls?.length && response.body?.choices?.[0]?.message?.content).length,
  },
  security: read('browser-security.json'),
};
writeFileSync('docs/evidence/summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
