// Derive P0.1 results from saved real traces, never synthesize an agent action.
import { readFileSync, writeFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const base = 'docs/evidence';
const fixtureClause = readFileSync('fixtures/fixture.html', 'utf8').match(/<p id="data-sharing">([^<]+)<\/p>/)?.[1];
if (!fixtureClause) throw new Error('Expected fictional fixture clause missing');
const normalizeText = text => text.toLowerCase().replace(/\s+/g, ' ').trim();
const quoteExcerpt = normalizeText(fixtureClause).split(' ').slice(0, 10).join(' ');
const textJson = text => { try { return JSON.parse(text); } catch { return null; } };
const inspectResponse = response => {
  const message = response.body?.choices?.[0]?.message ?? {};
  const calls = message.tool_calls ?? [];
  const json = typeof message.content === 'string' ? textJson(message.content.trim()) : null;
  const embedded = typeof message.content === 'string' ? textJson(message.content.match(/\{[\s\S]*\}/)?.[0] ?? '') : null;
  return {
    requestId: response.requestId, nativeToolCallsPresent: calls.length > 0,
    nativeToolNames: calls.map(call => call.function?.name),
    nativeActionPresent: calls.some(call => textJson(call.function?.arguments)?.action),
    rawFormat: calls.length ? 'native-tool_calls' : json ? 'content-plain-JSON' : embedded ? 'content-embedded-JSON' : 'unparseable-content',
    rawAction: json?.action ?? embedded?.action ?? null,
    finishReason: response.body?.choices?.[0]?.finish_reason,
    usage: response.body?.usage,
  };
};
const summarize = directory => {
  const browser = read(`${base}/${directory}/browser-integration.json`);
  const responses = read(`${base}/${directory}/page-agent-responses.json`);
  const ordinary = browser.attempts.filter(attempt => !attempt.injectedFault);
  const times = ordinary.map(attempt => attempt.result.durationMs / 1000).sort((a, b) => a - b);
  const sum = key => ordinary.reduce((total, attempt) => total + (attempt.result[key] ?? 0), 0);
  const attempts = browser.attempts.map((attempt, index) => {
    const beginning = attempt.gpuEvidence.samples[0]?.at;
    const ending = browser.attempts[index + 1]?.gpuEvidence.samples[0]?.at;
    const responseChecks = responses.filter(response => response.at >= beginning && (!ending || response.at < ending)).map(inspectResponse);
    const validCalls = attempt.result.steps?.map(step => ({ name: step.name, input: step.input,
      output: step.output, usage: { promptTokens: step.promptTokens, completionTokens: step.completionTokens } })) ?? [];
    const inferenceIntervals = (attempt.result.activities ?? []).flatMap((activity, activityIndex, activities) => {
      if (activity.type !== 'executing') return [];
      const thinking = activities.slice(0, activityIndex).findLast(item => item.type === 'thinking');
      return thinking ? [{ selectedTool: activity.tool, milliseconds: activity.elapsedMs - thinking.elapsedMs,
        note: 'Wall time from real thinking to executing; includes transport, prompt processing and any retries.' }] : [];
    });
    return { attempt: attempt.attempt, fault: attempt.injectedFault, status: attempt.result.status,
      domActionSucceeded: validCalls.some(step => step.name === 'click_element_by_index' && !step.output.includes('❌')),
      correctSectionIdentified: attempt.result.identifiedClause ?? false,
      validCompletion: attempt.result.agentSuccess && validCalls.some(step => step.name === 'done'),
      policyVisible: attempt.dom.dataSharingVisible, data: attempt.result.data,
      exactSectionThree: /\bsection\s*[:#-]?\s*3(?![.\d])/i.test(attempt.result.data),
      quotedFixtureExcerpt: normalizeText(attempt.result.data).includes(quoteExcerpt),
      calls: attempt.result.toolCalls, failedCalls: attempt.result.failedToolCalls,
      retries: attempt.result.retries, invalidModelResponses: attempt.result.invalidToolResponses,
      retryReasonsAndErrors: attempt.result.errors, durationSeconds: attempt.result.durationMs / 1000,
      fullGpuThroughout: attempt.gpuEvidence.fullGpuThroughout, peakGpuUtilization: attempt.gpuEvidence.peakUtilization,
      peakVramMiB: attempt.gpuEvidence.peakVramMiB, gpuSampleCount: attempt.gpuEvidence.samples.length,
      modelContext: attempt.resident.models[0]?.context_length,
      rawResponseChecks: responseChecks, validatedExecutedCalls: validCalls, inferenceIntervals,
    };
  });
  return { directory, measuredAt: browser.measuredAt, status: browser.status, ordinaryCount: ordinary.length,
    successfulTasks: ordinary.filter(attempt => attempt.result.status === 'PASS').length,
    independentlyVerifiedTasks: attempts.filter(attempt => !attempt.fault && attempt.status === 'PASS' && attempt.domActionSucceeded &&
      attempt.policyVisible && attempt.correctSectionIdentified && attempt.exactSectionThree && attempt.quotedFixtureExcerpt && attempt.validCompletion).length,
    successRate: browser.ordinarySuccessRate, meanSeconds: times.reduce((total, time) => total + time, 0) / times.length,
    medianSeconds: times.length % 2 ? times[Math.floor(times.length / 2)] : (times[times.length / 2 - 1] + times[times.length / 2]) / 2,
    minimumSeconds: times[0], maximumSeconds: times.at(-1), calls: sum('toolCalls'), failedCalls: sum('failedToolCalls'),
    retries: sum('retries'), invalidModelResponses: sum('invalidToolResponses'),
    nativeToolResponsesIncludingFault: responses.filter(response => response.body?.choices?.[0]?.message?.tool_calls?.length).length,
    contentOnlyResponsesIncludingFault: responses.filter(response => !response.body?.choices?.[0]?.message?.tool_calls?.length).length,
    allFullGpu: ordinary.every(attempt => attempt.gpuEvidence.fullGpuThroughout),
    allVisibleAfterSuccessfulTask: ordinary.filter(attempt => attempt.result.status === 'PASS').every(attempt => attempt.dom.dataSharingVisible && !attempt.dom.hiddenAfter),
    safety: read(`${base}/${directory}/browser-security.json`), attempts,
  };
};
const result = { generatedAt: new Date().toISOString(), model: 'qwen3.5:9b-q4_K_M', context: 8192,
  originalP0: { successRate: read(`${base}/p0-original/browser-integration.json`).ordinarySuccessRate, source: 'p0-original/browser-integration.json',
    note: 'Historical five-task P0 rate; unchanged ten-task comparison below is the stronger contemporaneous baseline.' },
  baseline: summarize('p0.1-baseline'), rejectedExactSchema: summarize('p0.1-schema'), final: summarize('p0.1-final'),
  probes: read(`${base}/p0.1-probes/summary.json`), reflectionProbes: read(`${base}/p0.1-reflection-probes/summary.json`),
  manualToolbar: { status: 'BLOCKED', reason: 'Computer Use native pipe unavailable (Windows error 2); enabled CUA apps/browsers empty; conventional branded Chrome paths not found. Automated cached Chromium is separate evidence.' },
};
writeFileSync(`${base}/p0.1-reliability-summary.json`, JSON.stringify(result, null, 2));
for (const key of ['baseline', 'rejectedExactSchema', 'final']) {
  const { attempts, safety, ...summary } = result[key];
  console.log(key, JSON.stringify(summary, null, 2));
}
