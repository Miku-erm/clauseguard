# P4 evaluation — PROVISIONAL

Generated 2026-10-13T22:53:24.988Z. Independent draft references have no human approval. Inference scope: full-document. Metrics cover selected reference chunks only; no complete-document score or legal certification. Bu uygulama hukuki tavsiye vermez.

| Document | TP | FP | FN | Precision | Recall | F1 | Analyzed / extracted chunks |
|---|---:|---:|---:|---:|---:|---:|---|
| github | 1 | 0 | 0 | 100.0% | 100.0% | 100.0% | 245/254 (PARTIAL) |
| discord | 2 | 0 | 0 | 100.0% | 100.0% | 100.0% | 187/188 (UNKNOWN) |
| reddit | 0 | 3 | 1 | 0.0% | 0.0% | 0.0% | 71/71 (UNKNOWN) |
| spotify | 1 | 2 | 1 | 33.3% | 50.0% | 40.0% | 164/170 (UNKNOWN) |
| dropbox | 0 | 1 | 2 | 0.0% | 0.0% | 0.0% | 90/97 (UNKNOWN) |

Micro: TP 4, FP 6, FN 4; precision 40.0%, recall 50.0%, F1 44.4%. Macro: precision 46.7%, recall 50.0%, F1 48.0%.

Evidence validity 57.7%; severity agreement 0.0%; 246 original model calls; 8 invalid structured responses; 8 response failures. Unevaluated: none. Unmatched predictions can be reference gaps; see machine-readable error analysis. Zero denominators are null, not perfect negatives.

| Category | TP | FP | FN |
|---|---:|---:|---:|
| THIRD_PARTY_DATA_SHARING | 0 | 0 | 0 |
| TRACKING_AND_PROFILING | 0 | 0 | 0 |
| UNCLEAR_DATA_RETENTION | 0 | 0 | 0 |
| RESTRICTED_USER_RIGHTS | 0 | 1 | 0 |
| AUTOMATIC_RENEWAL | 0 | 0 | 0 |
| DIFFICULT_CANCELLATION_OR_REFUND | 2 | 0 | 1 |
| UNILATERAL_TERMS_CHANGES | 0 | 0 | 0 |
| LIMITATION_OF_LIABILITY | 2 | 5 | 3 |

- [github](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service): Effective April 27, 2026; accessed 2026-10-13T20:43:04.530Z; GitHub standard individual-user terms; US/California provisions; source hash 88f85845caf52f3f0c5b2ca7862589cd78f35256e0115a281d7547854660b271.
- [discord](https://discord.com/terms): Effective September 29, 2025; accessed 2026-10-13T20:43:07.055Z; General terms with region-specific dispute provisions; source hash d8a787422698ac39949615715a78f06985db7346f4bd77e0c3abe4d344faeec5.
- [reddit](https://redditinc.com/policies/user-agreement): Effective July 1, 2026; revised May 26, 2026; accessed 2026-10-13T20:44:22.692Z; US and outside EEA/UK/Switzerland ONLY; EEA branch excluded; source hash a6d182b4aa6bac3bf3c629db787391a217f933d70a2c5664c9c6ed541295b6a9.
- [spotify](https://www.spotify.com/tr-tr/legal/end-user-agreement/): Last updated August 26, 2025 (Son Güncelleme: 26 Ağustos 2025); accessed 2026-10-13T20:43:10.435Z; tr-tr Turkish regional version; source hash 401d734db094bd386eeae685f497ccff9dfd663d78ce5c67a1f7335f2cc1f100.
- [dropbox](https://www.dropbox.com/terms): Effective January 7, 2025; accessed 2026-10-13T20:43:13.507Z; General consumer terms; regional exceptions retained, announced 2027 version not followed; source hash 26d95f6839e56300785f89845f1496335e4819c8b0e1392fd15bc9c857d01c23.

Full snapshots, predictions and native traffic remain in ignored .local/p4. Public evidence contains metadata and exact span references only.

## Methodology and review workflow

Eight exact-span reference labels were drafted by direct reading before real predictions and frozen with a SHA256 review log. All labels remain PENDING_HUMAN_REVIEW. Assistant semantic judgments are also provisional. Human reviewers should inspect the private source span, adjoining qualifications and proposed interpretation, record their identity/date/rationale, and append a review-log entry; no approval is inferred. Do not revise labels merely to fit predictions.

Matching requires identical document/category/chunk, a positive overlap of at least half the shorter span, and an explicit SUPPORTED semantic review. Exact quotation alone cannot grant a TP. Maximum-cardinality one-to-one bipartite matching uses deterministic input-order tie breaking. Duplicate predictions beyond a matched reference are FPs within the declared scope. Severity is compared only on semantic matches. Review fingerprints bind judgments to the exact prediction; stale reviews do not apply to a new run. Findings in neighboring, unannotated chunks remain unscored, never automatically false positives.

TP/FP/FN concern this incomplete reference sample, not exhaustive document recall. Unmatched predictions may be reference gaps; machine-readable errors preserve that uncertainty. Each FN records extracted/analyzed/rejected state and source spans. Missing evaluation is excluded from micro/macro metrics and listed separately. Precision=TP/(TP+FP), recall=TP/(TP+FN), F1=2TP/(2TP+FP+FN). Zero denominator yields null/N/A. Macro is the arithmetic mean of available per-document rates, excluding null rates.

Evidence validity is independently reverified from completed schema-valid native proposals BEFORE deduplication: valid proposals/(valid+rejected proposals). Invalid JSON syntax, invalid structured/completion responses, response failures and semantic errors are separate counters. Complete extraction coverage is never manufactured; full extracted-text analysis does not establish full website coverage.

Snapshots, model requests, responses and predictions remain ignored under .local/p4. Acquisition records preserve dates, original/derived hashes and regional scope. Reddit uses only the official US/non-EEA branch; no two regional versions are merged. A source-backed finding on UNKNOWN/PARTIAL coverage can be evaluated, but cannot authorize a whole-contract score.

Reproduce with npm run eval:real (full extracted-text scope, cached when identical); node scripts/eval-real.mjs --fresh for new inference; --selected for the pilot scope. Then independently review fresh predictions, run npm run eval:metrics and npm run eval:report. Cached outputs retain original inference timings and are labeled CACHED; they are never new model measurements.

## P4.1 versioned comparison and annotation review

BASELINE_P4 preserves original full-source results; CANDIDATE_P4_1 is a selected-batch pilot, not a full-corpus performance comparison; FINAL_P4_1 is a separate full inference run when the smaller gates permit it. evaluation/p4.1/source-manifest.json pins the identical original five HTML/extraction snapshots and the unchanged eight-label gold SHA. Config metadata records prompt, schema, provider, batching and verifier hashes plus model/context/output options and scope. Cache equality covers the complete configuration; exact native-request resume never invents a response. Failed/capped responses and bounded retries remain visible.

The review packet has eleven direct-reading drafts: eight original positive labels plus an additional GitHub liability cap and two negative foreseeability controls (Dropbox/Discord). Supplemental items do not enter before/after metrics. All are PENDING_HUMAN_REVIEW, not expert-approved; all existing sources/cases have influenced development, so no untouched holdout is claimed. Semantic reviews must be independently reread for each fresh prediction fingerprint; quote validity alone does not establish correct interpretation.

P4 had four failed batches and 23 unanalysed chunks due to eight 1536-token incomplete JSON completions. Source extraction UNKNOWN/PARTIAL is separate from computational batch coverage; completing every extracted chunk still does not authorize a complete-contract score. Compare all improvements and regressions with docs/p4.1-verification.md and the archived development runs. The older selected pilot's 75% provisional F1 does not validate subsequent prompt edits.
