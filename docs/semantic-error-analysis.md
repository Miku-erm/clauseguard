# P4.1 semantic error analysis

## Frozen baseline

P4: 137 unit tests, provisional TP 4 / FP 6 / FN 4, precision 40%, recall 50%, F1 44.44%, eight unverified source-reading references. No reference has human/legal-expert approval. Full analysis: 238/242 batches, 757/780 chunks, 246 fresh risk calls. Original raw and typed evidence remains in P4 paths; before-change implementation/reference/metric copies are in docs/evidence/p4.1/baseline.

## Independent renewal adjudication v1

The ORIGINAL unchanged fixture states monthly automatic renewal, no reminders, and cancellation at least thirty days before renewal. Both AUTOMATIC_RENEWAL and DIFFICULT_CANCELLATION_OR_REFUND are supported: the notice failure and cancellation lead time impose distinct disadvantages. No accessible-cancellation/reminder/refund protection is stated in this complete fictional fixture. This is a source-reading software-test adjudication, not a legal opinion or human review.

The old expected 14 described only medium renewal (20 ? .7). Medium renewal plus medium cancellation yields round(20 ? .7 + 18 ? .7) = 27. The original score-14 assertion and historical failure are preserved. The corrected browser assertion requires exactly the two supported categories and verifies the UI score against the unchanged deterministic formula for the actual model severities. This separates semantic detection from deterministic UI/scoring; it does not force a stochastic model severity. See evaluation/p4.1/renewal-adjudication.json and baseline/scripts__test-p3-browser.mjs.

## Output-boundary root cause

All eight original invalid JSON responses have done_reason=length and eval_count=1536. They are four failed batches, each with the same incomplete response on two bounded attempts. Prompt counts 1025?1519 are far below 8192; think=false and no returned thinking text. Available records establish output exhaustion, not an OOM, context exhaustion, interruption or GPU fallback. Raw sanitized tails and per-source failed IDs are preserved in baseline-diagnosis.json. Nine GitHub, one Discord, six Spotify and seven Dropbox primary chunks account for the 23 unanalysed chunks; Reddit had none. Original unbatchable/pending sets are inspected separately from extraction UNKNOWN/PARTIAL.

Candidate caps batches at two new source chunks, preserves bounded previous context, and selects 3072, 2048 or 1536 response tokens according to the complete conservative byte-based input budget. 1536 is still the fallback for large inputs; it is not claimed to eliminate all output exhaustion. Input batches are recomputed conservatively with the same 8192 context; no source truncation. Native completion/schema/context validation still rejects failures. OUTPUT_LIMIT_REACHED is an explicit rejected-completion error, not repaired JSON. At most two attempts remain. Page Agent grammar and official normalizer are unchanged.

## Evidence mismatch classification

The baseline contains 129 rejected finding records: 51 CATEGORY_CONTEXT_MISMATCH, 27 other nonexact quotes requiring review, 26 ellipsis/omitted-text proposals, 19 punctuation changes, two unknown chunk IDs and four one-to-one space equivalents. This is a classification of stored rejected records, not a claim that every other mismatch is malicious fabrication. No model inference was used for this audit.

Only U+00A0 (NBSP) and U+202F (narrow NBSP) are treated as U+0020 for substring location. Each maps to exactly one UTF-16 code unit: original offsets stay unchanged. The accepted quote is restored from the original source slice, with original document/chunk hashes. Occurrence metadata lists only literal repeats of that restored span; different original space variants are not labeled literal repeats. First occurrence selection follows existing deterministic policy; repeated text may still require human interpretation. No smart-quote substitution, case folding, whitespace collapse, ellipsis expansion, edit distance, adjacent-chunk joining or fabricated-quote replacement. Wrong IDs/batches/versions and integrity errors remain rejected. Tests cover original restoration, repeated variants, literal duplicates, extra spaces, case/punctuation changes and adjacent clauses.

## Semantic failure mechanisms and candidate experiments

Generic chat/JSON/evidence success does not establish semantic truth. Negations, privacy-versus-payment deadlines, statutory exceptions, indeterminate meaning and genuine low/conditional disadvantages need separate checks. The original eight reference labels remain byte-identical.

- V1: nine existing semantic checks passed, but extended prompt excluded source chunks and missed a qualified cap. Rejected candidate preserved.
- V2: small semantic and targeted checks passed, but one Reddit paragraph still exceeded the conservative input/output reservation. Coverage regression was not accepted.
- V3/V4: compact versions restored all source chunk budgeting, but a qualified cap was missed. Preserved failures.
- V5: fifteen targeted checks including three cap variants/repetitions passed; the existing ambiguous-retention case then regressed in the separate semantic suite. Not treated as final success.
- Final candidate: distinguishes affirmative indefinite/excessive storage from reasonable/as-needed periods without bounds (unresolvedIssues); qualified affirmative disadvantages still require findings, and damages caps must state scope and mandatory protections. Category IDs/weights and score rounding stay unchanged. Final measurements are supplied by p4.1-verification.md, not assumed here.

No second-model verifier has been added: targeted instruction/budget changes are measured first, and no evidence presently justifies an extra full pass. No keyword-only production classifier or fixture-name answer rule was introduced. Development cases and the five P4 sources already influenced development; there is no untouched-holdout claim. Supplemental source-reading drafts are review material, not replacement ground truth.

## Operational interruption

Work paused for the user-reported Defender incident, with a separate history-only audit. The user reported manual removal and resolution and explicitly authorized resumption. This record does not certify Windows clean or attribute the incident to a particular program. P4.1 model/runtime versions and loopback configuration are preserved; no new model/dependency/runtime is downloaded.

## Additional P4.1 development failures

The V6 selected pilot improved provisional F1 to 75%, but actual browser checks exposed false unresolved issues in safe terms. Later compact prompts alternated between false uncertainty, rejected quote proposals and ambiguous-retention false positives. These are preserved under docs/evidence/p4.1; they are not final passes or an untouched holdout. The scoped candidate passed eleven semantic repeats and four safe/renewal/ambiguous fixture checks, then the wider targeted suite exposed unnecessary questions about explicit deletion deadlines and statutory-record exceptions. Final category guidance distinguishes these bounded protections from genuinely unbounded as-needed storage. New actual inference is required after this change; the earlier pilot is not evidence for the changed prompt.
