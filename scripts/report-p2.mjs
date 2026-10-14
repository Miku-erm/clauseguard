// Read existing evidence only; never calls a model or invents labels.
import { readFileSync, writeFileSync } from 'node:fs';
const directory = process.argv[2] ?? process.env.CLAUSEGUARD_RISK_EVIDENCE_DIR ?? 'docs/evidence/p2-model-current';
const read = name => JSON.parse(readFileSync(`${directory}/${name}.json`, 'utf8'));
const summary = read('summary'); const network = read('network');
const definitions = JSON.parse(readFileSync('fixtures/p2/scenarios.json', 'utf8'));
definitions.push({ name: 'long', expectedCategories: ['AUTOMATIC_RENEWAL', 'THIRD_PARTY_DATA_SHARING'], allowedCategories: ['AUTOMATIC_RENEWAL', 'THIRD_PARTY_DATA_SHARING', 'DIFFICULT_CANCELLATION_OR_REFUND', 'TRACKING_AND_PROFILING'] });
definitions.push(...['partial', 'unknown'].map(name => ({ name, expectedCategories: ['AUTOMATIC_RENEWAL'], allowedCategories: ['AUTOMATIC_RENEWAL', 'DIFFICULT_CANCELLATION_OR_REFUND'] })));
const cases = definitions.map(definition => {
  const item = read(definition.name);
  const chunkIds = new Set(item.report.coverage.batches.flatMap(batch => batch.chunkIds));
  const caseRequests = network.filter(request => JSON.parse(request.request.messages[1].content).sourceData.some(chunk => chunkIds.has(chunk.sourceChunkId)));
  return { name: item.name, source: item.source, status: item.report.status, score: item.report.score, alarm: item.report.alarmLevel,
    verifiedCategories: item.report.findings.map(finding => finding.category), findings: item.report.findings.length, rejected: item.report.rejectedFindingCount,
    rejectedReasons: item.report.rejectedFindings.map(finding => finding.reason), unresolved: item.report.unresolvedIssues, calls: item.requests, batches: item.report.coverage.batches.length,
    durationMs: item.report.durationMs, missed: item.missed, acceptedFalsePositives: item.falsePositives?.length ?? 0,
    actualCalls: caseRequests.length,
    // Report proposals from this case's exact source IDs, including rejected interpretations.
    proposedFalsePositives: caseRequests.flatMap(request => { try { return JSON.parse(request.response.message.content).findings; } catch { return []; } }).filter(finding => !definition.allowedCategories.includes(finding.category)),
  };
});
const result = { phase: 'P2', modelEvidence: directory, model: summary, cases,
  nativeTimingAllRequests: {
    promptTokens: network.reduce((sum, item) => sum + item.response.prompt_eval_count, 0),
    loadMs: network.reduce((sum, item) => sum + item.response.load_duration / 1e6, 0),
    minLoadMs: Math.min(...network.map(item => item.response.load_duration / 1e6)), maxLoadMs: Math.max(...network.map(item => item.response.load_duration / 1e6)),
    promptMs: network.reduce((sum, item) => sum + item.response.prompt_eval_duration / 1e6, 0), generationMs: network.reduce((sum, item) => sum + item.response.eval_duration / 1e6, 0),
    totalMs: network.reduce((sum, item) => sum + item.response.total_duration / 1e6, 0), generatedTokens: network.reduce((sum, item) => sum + item.response.eval_count, 0),
    generationTokensPerSecond: network.reduce((sum, item) => sum + item.response.eval_count, 0) / (network.reduce((sum, item) => sum + item.response.eval_duration, 0) / 1e9),
    maxPromptTokens: Math.max(...network.map(item => item.response.prompt_eval_count)), maxInputEstimate: Math.max(...cases.flatMap(item => read(item.name).report.coverage.batches.map(batch => batch.estimatedPromptTokens))),
  },
  proposedFalsePositives: cases.reduce((sum, item) => sum + item.proposedFalsePositives.length, 0),
  note: 'Quote match proves textual existence, not correct interpretation. Semantic proposals and accepted/rejected evidence are separately reported. Per-case native requests are attributed by versioned source chunk IDs.' };
writeFileSync('docs/evidence/p2-summary.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ modelStatus: summary.status, calls: summary.actualModelCalls, schemaValid: summary.schemaValidResponses, accepted: summary.acceptedEvidence, rejected: summary.rejectedEvidence, proposedFalsePositives: result.proposedFalsePositives, fullGpu: summary.fullGpu, cases: cases.map(({ proposedFalsePositives, ...item }) => ({ ...item, proposedFalsePositives: proposedFalsePositives.length })) }, null, 2));
