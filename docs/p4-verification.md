# Phase P4 verification

Measured 2026-10-13T23:04:48.766Z. Work limited to P4 in Challenge3. All numeric quality metrics are **PROVISIONAL**, based on eight preprediction direct-reading references without human/legal-expert approval. Full extracted-text inference and reference annotation coverage are separate.

## Original P3 failure

Reproduced before modifications by the unchanged browser assertion. Classification **MODEL_SEMANTIC_FAILURE**: full renewal clause present, valid empty findings, zero validator rejections, clear disadvantage misrouted to uncertainty; no truncation/dedup loss. Causal injection distraction remains unproved by the direct controls. Final original browser result: **PASS** . Repeatability result **DEGRADED**, 9 actual calls, 9 schema-valid responses. See baseline/, original-final/ and repeatability/. Earlier failed prompt/browser experiments remain preserved.

## Changes and stability

General semantic prompt, alternative multilingual title recognition, deterministic evaluation matching, reference/review workflow, twelve adversarial fixtures, live evaluation and verification scripts, tests and documentation. No fixture-specific production findings or category-forcing keyword rule. Protected file audit: src/risk/prompt.ts changed; other protected provider, schema/grammar, evidence, weights, batching, Reflex and Page Agent sources are byte-identical to the captured baseline. No new dependency, model, runtime, browser, CUDA or cloud service installed. Existing Qwen/Ollama reused.

## Prompt injection and tools

12/12 cases; runtime failures none; Page Agent task failures none; expected-renewal suppression none. Actual Alibaba requests 43; native risk requests 12; DOM tool calls 43, failed tools 7, upstream retries 0. Tool failures were retained, not response-only passes. Every successful task includes actual opening of the hidden section. Forbidden payment instrumentation stayed false. Hidden B did not enter Page Agent input; its visible paired risk probe did. No immunity claim follows from hidden exclusion. Actual request delivery is recorded per case. Disclosure postchecks are bounded; no real secret was supplied.

## Five official contracts and coverage

| Source | Extraction | Analyzed / extracted chunks | Native calls | Duration |
|---|---|---:|---:|---:|
| github | PARTIAL | 245/254 | 77 | 611.71 s |
| discord | UNKNOWN | 187/188 | 60 | 862.38 s |
| reddit | UNKNOWN | 71/71 | 26 | 260.68 s |
| spotify | UNKNOWN | 164/170 | 63 | 787.36 s |
| dropbox | UNKNOWN | 90/97 | 20 | 452.89 s |

- [GitHub Terms of Service - GitHub Docs](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service): Effective April 27, 2026, GitHub standard individual-user terms; US/California provisions; accessed 2026-10-13T20:43:04.530Z; 45388 characters, 254 chunks; document SHA256 88f85845caf52f3f0c5b2ca7862589cd78f35256e0115a281d7547854660b271.
- [Terms of Service | Discord](https://discord.com/terms): Effective September 29, 2025, General terms with region-specific dispute provisions; accessed 2026-10-13T20:43:07.055Z; 59222 characters, 188 chunks; document SHA256 d8a787422698ac39949615715a78f06985db7346f4bd77e0c3abe4d344faeec5.
- [reddit](https://redditinc.com/policies/user-agreement): Effective July 1, 2026; revised May 26, 2026, US and outside EEA/UK/Switzerland ONLY; EEA branch excluded; accessed 2026-10-13T20:44:22.692Z; 23871 characters, 71 chunks; document SHA256 a6d182b4aa6bac3bf3c629db787391a217f933d70a2c5664c9c6ed541295b6a9.
- [Kullanım Hüküm ve Koşulları - Spotify](https://www.spotify.com/tr-tr/legal/end-user-agreement/): Last updated August 26, 2025 (Son Güncelleme: 26 Ağustos 2025), tr-tr Turkish regional version; accessed 2026-10-13T20:43:10.435Z; 45746 characters, 170 chunks; document SHA256 401d734db094bd386eeae685f497ccff9dfd663d78ce5c67a1f7335f2cc1f100.
- [Terms of Service - Dropbox](https://www.dropbox.com/terms): Effective January 7, 2025, General consumer terms; regional exceptions retained, announced 2027 version not followed; accessed 2026-10-13T20:43:13.507Z; 25212 characters, 97 chunks; document SHA256 26d95f6839e56300785f89845f1496335e4819c8b0e1392fd15bc9c857d01c23.

Four read-only sources use actual MV3 FAST extraction/activeTab action. Reddit uses an explicitly derived official non-EEA/US snapshot, with the second regional agreement excluded and hashes recorded. Initial visible-h1 timeouts are preserved. No login, purchase, consent click or restriction bypass. Full HTML/text/native traffic/predictions remain ignored under .local/p4. Scores remain withheld on UNKNOWN/PARTIAL extraction, rejected evidence or unfinished batches.

## Metrics and errors

TP 4, FP 6, FN 4; micro precision 40.0%, recall 50.0%, F1 44.4%. Macro precision 46.7%, recall 50.0%, F1 48.0%. Evidence validity before dedup 57.7% (176 valid/129 rejected proposals). Severity agreement 0.0%. Invalid JSON syntax 8; invalid structured/completion responses 8; response failure records 8. Unevaluated reference cases: none.

Per-document/category metrics, one-to-one matches, unsupported interpretations, source spans and extracted/analyzed/rejected error details are in evaluation/metrics/latest.json and docs/evaluation.md. Reference coverage is sparse; unannotated findings are unscored and not automatically false positives. Stale review fingerprints cannot grant a TP. Neither zero findings nor absent complete scores mean zero real risks.

## GPU / performance

Model qwen3.5:9b-q4_K_M, Q4_K_M; Ollama 0.40.0; RTX 4060 Laptop, 8188 MiB, driver 596.49, target 32 GB RAM. Context unchanged 8192. Full GPU residency true; CPU model residency 0% observed; 2948 samples; peak VRAM 7383 MiB (whole GPU), peak compute 100%. Independent ollama ps/API residency and nvidia-smi samples during actual inference. CPU orchestration still exists; full model residency is not a claim of no CPU work.

246 actual original model calls; 237376 measured prompt tokens, 101828 successfully decoded generated tokens, max prompt 1707, 39.895 decoded-response generation tokens/s, 2975.023 s total analysis. Warm reported load duration sum 1907.448 ms; no cold-load measurement claimed. Failed responses are counted separately and preserved. Native response raw timing is available privately. 4096/16384 were not retested or substituted; no silent CPU/mixed fallback. Listener remains 127.0.0.1:11434.

## Regression

- npm run typecheck: exit 0.
- npm test: exit 0.
- npm run build: exit 0.
- node scripts/test-p4-semantics.mjs: exit 1.
- node scripts/test-p4-original-browser.mjs: exit 0.
- npm run test:browser: exit null.
- node scripts/test-p2-browser.mjs: exit 0.
- node scripts/test-p1-browser.mjs: exit 0.
- node scripts/test-browser.mjs (3 ordinary + controlled fault): exit 0.
- npm run test:browser: exit 1.

Cached Chromium real MV3 automation is separate from **BLOCKED manual branded Chrome toolbar validation**. P1 FAST/SLOW, P0.1, P2 and P3 retain their own evidence directories under p4/regression-*. The full suite does not skip later phases when a prior phase fails. The original hardcoded P3 severity/score assertion is preserved even though model severity can vary.

## Gates

| Gate | Status |
|---|---|
| A | PASS |
| B | DEGRADED |
| C | PASS |
| D | DEGRADED |
| E | PASS |
| F | PASS |
| G | PASS |
| H | FAIL |
| I | PASS |

A investigation; B semantic quality; C tested runtime/security controls; D five real evaluations; E deterministic calculations (PROVISIONAL labels); F source validation; G measured GPU; H full regression; I documentation. No arbitrary F1 target was used to change labels.

## Reproduction

From Challenge3: npm run ollama:start; node scripts/verify-p4-build.mjs; npm run eval:acquire; npm run eval:real; independently review fresh predictions; npm run eval:metrics; npm run eval:report; npm run test:security:p4; node scripts/run-p4-regression.mjs; node scripts/report-p4.mjs. Direct node scripts/eval-real.mjs --fresh forces new full inference; --selected uses the separate pilot scope. Reuse immutable sources/references; changed hashes require a new independently read annotation revision. See README for installation, Chrome loading and fixture commands.

Next recommended work: human annotation review and bounded semantic/output-budget reliability improvements before final delivery. No next phase, MCP, llms.txt, Cypress video or GitHub publication implemented. Bu uygulama hukuki tavsiye vermez.

## Interrupted experiment and recovery

The first full evaluation and queued verification unexpectedly ended with Windows exit code 1073807364. The user subsequently reported an accidental PC shutdown attempt that they canceled; this attribution is user-reported, not independently established from runtime logs. Native reports were preserved, but raw buffers had not finalized and were never fabricated. NVIDIA showed 995/897 MiB with no model compute process while ollama ps still claimed 100% GPU; that contradictory snapshot was rejected as GPU proof. Only the verified project-owned Ollama service was restarted with unchanged model/runtime/quantization/context/driver configuration. Actual later inference independently verified CUDA0 on the RTX 4060, all 33/33 layers offloaded, full API residency and longitudinal NVIDIA activity. See runtime-interruption.json, runner-loss-nvidia-smi.txt, gpu-load.txt and the private archived log.

The runner now writes each native response and GPU sample to durable private NDJSON immediately, applies five-second diagnostic timeouts, and can resume only exact-request, completed schema-valid original native responses with explicit CACHED provenance. Changed source/model/context fails matching; invalid outputs are not repaired or invented. The final full evaluation used 246 FRESH calls and no response replay. A separate five-document cache check made zero model calls and zero new GPU measurements. The initial aggregate browser attempt did not finalize after P3; later components were run individually, and the final aggregate has bounded phase timeouts and per-phase exit records.

All-response performance (including failed completions): 247730 prompt tokens, 114116 generated tokens, 39.962 tokens/s, warm load sum 1960.619 ms. These are original recorded inference timings; current eval runner may be CACHED and make zero new requests.

Final full-suite exits: P3=1, P2=0, P1=0, P0.1=0; aggregate=1. The renewal score27 is automatic renewal MEDIUM14 plus cancellation difficulty MEDIUM13. Original expected14 remains unchanged; failure reflects a changed finding set, not changed weights or arithmetic.
