import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const sources = read('evaluation/sources.json');
const baseline = read('docs/evidence/p4.1/baseline/evaluation__metrics__latest.json');
const pilot = read('evaluation/p4.1/candidate-metrics.json');
const labels = read('evaluation/annotations/gold.json').labels;
const percent = x => (100 * x).toFixed(2) + '%';
const lines = ['# Final five-contract evaluation',
  'Reuses authentic recorded evaluation. No new five-document inference. All metrics PROVISIONAL; eight direct-reading draft labels, zero human/expert approvals. Controlled demo fixtures are separate and do not replace these sources.',
  '| Source / official URL | Accessed (UTC) | Recorded extraction | Extracted chunks |\n|---|---|---|---:|',
  ...sources.map(s => `| [${s.id}](${s.url}) | ${s.accessedAt} | ${s.extractionCoverage} | ${s.chunks} |`),
  '## Separate experiments',
  '| Experiment | Inference scope | TP | FP | FN | Precision | Recall | F1 |\n|---|---|---:|---:|---:|---:|---:|---:|',
  ...[['P4 baseline', baseline, 'Full extracted-text run; partial source/analysis coverage'], ['P4.1 candidate', pilot, 'Selected-reference-batch pilot; 8 fresh calls']].map(([n, m, scope]) => `| ${n} | ${scope} | ${m.micro.tp} | ${m.micro.fp} | ${m.micro.fn} | ${percent(m.micro.precision)} | ${percent(m.micro.recall)} | ${percent(m.micro.f1)} |`),
  'Do not claim an exhaustive full-run improvement from these different inference scopes. P4 completed 238/242 batches and 757/780 chunks in approximately 49.58 minutes with 246 calls. Eight 1536-token capped responses caused four failed batches. P4.1 final full run was not performed. Its later delivery prompt explicitly allows reuse of the original five-source evidence.',
  '## Method and trust limits',
  'Official public pages were captured without login or restriction bypass. Regional/version branches remain pinned; Reddit uses only the recorded US/non-EEA branch. Source document and HTML hashes, URL/date/version and coverage are preserved in evaluation/sources.json and evaluation/p4.1/source-manifest.json. Private original snapshots remain ignored in .local/p4/real.',
  'An exact original quote is independently verified before acceptance. Selected-reference metrics require document/category/chunk/span agreement plus an independently recorded, prediction-fingerprinted semantic-support draft review; one-to-one matching prevents duplicate true positives. Unannotated corpus findings are unscored. Unmatched predictions may reflect reference gaps, rather than proven false legal claims. No untouched holdout is claimed.',
  '## Detected and missed reference risks (P4.1 pilot)',
  '| Source | TP / FP / FN | Missed references |\n|---|---|---|',
  ...pilot.documents.map(d => `| ${d.sourceId} | ${d.metrics.tp}/${d.metrics.fp}/${d.metrics.fn} | ${d.falseNegatives.join(', ') || 'none'} |`),
  'Supported pilot interpretations include advance-paid no-refund restrictions, qualified damages exclusions/caps and conditional partial-period refunds. Residuals include an omitted Discord cap, duplicate Discord exclusion, Reddit exception loss, a Spotify payment lookback incorrectly called a claim deadline, and Dropbox cancellation/refund conflation. Exact errors and source extracted/analyzed/rejected state are in candidate-metrics.json; rationales are in candidate-semantic-reviews.json.',
  '## Representative original excerpts',
  'These short literal excerpts are illustrative, not substitutes for surrounding exceptions or whole clauses. Full context and review rationale are in docs/gold-label-review.md.',
  ...sources.map(s => {
    const label = labels.find(g => g.sourceId === s.id); const doc = read(`.local/p4/real/${s.id}.json`);
    const text = doc.sourceChunks.find(c => c.chunkId === label.chunkId).text;
    const tokens = [...text.matchAll(/\S+/g)]; const end = tokens[Math.min(19, tokens.length - 1)].index + tokens[Math.min(19, tokens.length - 1)][0].length;
    return `### ${s.id}\n\n> ${text.slice(0, end)}\n\nDraft category: ${label.category}. Source hash: \`${doc.contentHash}\`. Review: PENDING_HUMAN_REVIEW.`;
  }),
  '## Coverage and legal disclaimer',
  'Extraction UNKNOWN/PARTIAL cannot authorize a complete-contract numeric score. Completing every extracted chunk would still not prove full website completeness. All five real-source complete-document scores remain withheld. Sparse annotations, severity disagreement, translation errors and model variability limit generalization. Bu uygulama hukuki tavsiye vermez.'
];
fs.writeFileSync('docs/final-evaluation.md', lines.join('\n\n').replace(/\|\n\n\|/g, '|\n|') + '\n');
console.log('Recorded five-source evaluation compiled without new inference');
