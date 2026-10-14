# Phase P2 verification — 9 October 2026

P2 implements source-backed local risk analysis and deterministic scoring. This is an experimental university prototype, not legal advice or a completed assignment. No P3, MCP, llms.txt, final five-site evaluation, Cypress video or publication was performed. Dependencies, model, runtime, driver and quantization were reused without downloads. P0.1's Alibaba grammar/provider/controller files were preserved.

## Acceptance gates

| Gate | Status | Executed evidence and limitation |
| --- | --- | --- |
| A Structured output | PASS | Final native model series: 99/99 schema-valid responses, zero malformed responses/retries. Independent strict Zod risk grammar; no Page Agent tools. |
| B Risk detection | DEGRADED | Final eight labeled scenarios missed zero required categories and accepted zero out-of-label categories. Three unsupported retention proposals across injection/PARTIAL/UNKNOWN experiments were rejected. Earlier candidates accepted false positives; those failures remain recorded. Severity and legal interpretation are still model judgments. |
| C Evidence verification | PASS | Unit tests reject fabricated quotes, unknown/out-of-batch chunks, changed versions/integrity and invalid arguments. Real accepted quotes match versioned original text; three final model proposals rejected by category-context guard. Exact quoting alone does not prove correct interpretation. |
| D Deterministic scoring | PASS | Unit tests exercise duplicate/max-severity handling, integer arithmetic, rounding, cap and all alarm boundaries. Same accepted inputs produce identical results. Browser renewal scores 14 and safe complete document 0. |
| E Coverage | PASS | Long source: all 183 chunks/52,092 characters processed in 90 batches. Ambiguity, rejection, PARTIAL/UNKNOWN extraction, cancellation, stale source, navigation and worker interruption withhold the numeric score. Browser interruption creates an explicit interrupted checkpoint, never a complete score. |
| F Prompt injection | PASS (tested control boundary) | Five fixture instructions cannot supply tools, numeric scores, credentials or executable commands. Actual page postMessage/content-script START_ANALYSIS attempts denied. Injection retains the renewal finding but returns PARTIAL/null because of rejected/spurious uncertainty. Semantic resistance is not universal. |
| G GPU/performance | PASS (measured 8192) | Repeated nvidia-smi/Ollama PROCESSOR/API residency measurements confirm 100% GPU at context 8192; no CPU offloading. Actual native prompt counts remain within the reserved budget. Results below are measured, not tokenizer estimates. |
| H Regression | PASS (automated scope) | Full real P2/P1/P0.1 suite exited zero; details below. Four protected original files have identical SHA-256 hashes to P1. Manual branded Chrome toolbar and arbitrary-origin activeTab validation remain BLOCKED. |

## Final real model series

Canonical evidence: [summary](evidence/p2-summary.json), [raw requests/responses](evidence/p2-model-current/network.json), [GPU samples](evidence/p2-model-current/gpu-samples.json), and individual source/report files in `evidence/p2-model-current/`. The model test uses real Ollama inference with JSDOM extraction; it is separate from the real MV3 browser suite and from mocked unit tests. Independent fixture labels live in `fixtures/p2/scenarios.json`, never in the model prompt. The long fixture's final labels are declared in the runner.

| Document | Extraction | Report | Score | Verified findings | Rejected proposals | Calls | Wall seconds |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Renewal | COMPLETE | COMPLETE | 14 | 1 renewal | 0 | 1 | 7.253 |
| Sharing | COMPLETE | COMPLETE | 20 | 1 sharing | 0 | 1 | 7.354 |
| Denial of sharing | COMPLETE | COMPLETE | 0 | 0 | 0 | 1 | 0.590 |
| Difficult cancellation/refund | COMPLETE | COMPLETE | 18 | 2 distinct cancellation findings | 0 | 1 | 15.279 |
| Ambiguous clause | COMPLETE | PARTIAL | null | 0 | 0 | 1 | 3.455 |
| Injection | COMPLETE | PARTIAL | null | 1 renewal | 1 | 1 | 14.286 |
| Safe terms | COMPLETE | COMPLETE | 0 | 0 | 0 | 1 | 0.802 |
| Long contract | COMPLETE | COMPLETE | 34 | renewal + sharing | 0 | 90 | 69.403 |
| Supplemental PARTIAL source | PARTIAL | PARTIAL | null | 1 renewal | 1 | 1 | 14.994 |
| Supplemental UNKNOWN source | UNKNOWN | PARTIAL | null | 1 renewal | 1 | 1 | 14.402 |

Totals across ten experiments: 99 responses, zero schema failures/retries, nine accepted findings and three rejected proposals. All nine accepted quotes exactly occur in their identified original chunks; zero final quote mismatches. All three rejected proposals use real renewal quotations but incorrectly infer unclear personal-data retention. A narrow storage/data context guard rejects them, records `CATEGORY_CONTEXT_MISMATCH` and withholds the score. It is a conservative relevance check, not a general legal classifier. Unusual vocabulary can cause rejection; other semantic errors can still pass an exact quote check. Independent labels evaluate category presence, not professional legal accuracy or all severity judgments.

Six of the eight ordinary scenarios produce COMPLETE reports; ambiguous and injection are PARTIAL. The two supplemental experiments prove extracted PARTIAL/UNKNOWN sources remain ineligible even when a genuine finding is retained. UNKNOWN is the source coverage status, not a misleading complete report status.

## Hardware and native telemetry

| Field | Measured/configured value |
| --- | --- |
| GPU | NVIDIA GeForce RTX 4060 Laptop GPU |
| Driver / VRAM / system RAM | 596.49 / 8188 MiB / approximately 31.75 GiB |
| Model / quantization | qwen3.5:9b-q4_K_M / Q4_K_M |
| Ollama / endpoint | 0.40.0 / http://127.0.0.1:11434/api/chat |
| Context / output reserve | 8192 / 1536 tokens |
| Cache / concurrency | Flash Attention, q8_0 KV; one model, one sequence |
| Loaded model size | 5,602,415,738 bytes; API size_vram equals size |
| Residency | 100% GPU; no measured CPU fraction |
| Samples / peak board VRAM / peak compute | 199 / 7368 MiB / 100% |
| Native maximum prompt count | 1149 tokens |
| Maximum conservative input estimate | 6633; plus 1536 output = 8169 ≤ 8192 |
| Generated tokens (all 99 calls) | 4277 |
| Prompt tokens (sum, including repeated context) | 102188 |
| Warm request load durations | 12.577–15.390 ms; 1375.978 ms sum |
| Prompt processing duration (all calls) | 29.116 s |
| Generation duration (all calls) | 113.703 s |
| Weighted generation speed | 37.616 tokens/s |
| Native total inference duration (all calls) | 146.553 s |

The initial preload occurs before timing individual cases. Warm per-request load durations are retained in raw native telemetry; these are not a cold-start benchmark. No P2 4096/16384 experiments were needed: this phase preserves the already verified 8192 configuration. The previous context experiments remain in [performance.md](performance.md). Eight GB does not guarantee full GPU residency at larger contexts. Requests fail on CPU/mixed residency, changed context, capped generation or an unexpected prompt count; there is no silent truncation. UTF-8 byte budgeting is intentionally conservative and yields 90 calls for the long fixture, which limits throughput.

## Browser and fault evidence

The second focused real MV3 run passed seven cases: normal renewal, safe zero, unknown coverage, DOM mutation during actual inference, cancellation during actual inference, navigation during actual inference and actual CDP ServiceWorker.stopWorker/restart. Raw [focused integration](evidence/p2-browser-second/integration.json) and [security checks](evidence/p2-browser-second/security.json) distinguish FINISHED/FAILED/INTERRUPTED job envelopes from report coverage. The interrupted report is FAILED/null until explicitly restarted. All risk requests originate in the Service Worker, target the fixed native endpoint/model/context and contain no tools. Scan-only FAST operations make zero inference calls. The rendered [popup screenshot](evidence/p2-browser-second/risk-report-popup.png) was visually inspected: Turkish explanations, original quotation, score/coverage, cancellation controls and legal disclaimer display correctly.

The first focused browser attempt failed before testing because browser-level CDP did not support ServiceWorker.enable. The runner now uses a page-level CDP session; the failed log and empty integration result are retained in `evidence/p2-browser/` and `p2-browser-run.log`. No fabricated pass replaced that failure.

The cached Chromium 153.0.8010.12 runs the built unpacked MV3 extension with a rendered popup tab. This does not verify manually operated branded Chrome's toolbar. That manual check and arbitrary-origin activeTab grants are BLOCKED in the available automation environment. Reproduce manually by loading `.output/chrome-mv3`, opening a fixture and using the real toolbar popup.

## Final regression record

Executed against the final build: `npm run typecheck` PASS; `npm test` **85/85 tests in ten files PASS**; `npm run build` PASS (870.16 kB reported output); `npm run test:browser` **exit 0**. Logs: [typecheck](evidence/p2-typecheck.log), [unit tests](evidence/p2-unit-tests.log), [build](evidence/p2-build.log), [full browser suite](evidence/p2-full-browser-run.log).

- [P2 MV3](evidence/p2-browser-verified/integration.json): seven cases PASS, including actual in-flight cancellation/source/navigation/worker faults. [Security](evidence/p2-browser-verified/security.json): denied non-popup sender, ignored page message, tool-free fixed native SW transport.
- [P1 regression](evidence/p2-p1-regression/integration.json): twelve FAST outcomes with zero LLM calls; five/five ordinary SLOW tasks complete (three hidden, two multiple-section). Three injected safety faults produce expected FAILED results with no forbidden action. There are 279 recorded source checks across all outcomes; original long extraction remains 181 chunks/44,548 characters.
- [Original P0.1](evidence/p2-p0.1-regression/browser-integration.json): three/three ordinary tasks PASS, zero retries, six actual actions (three permitted clicks, three done calls). The fourth removed-button fault is deliberately FAIL/aborted with one blocked click; it is an expected safety result, excluded from ordinary success rate. GPU observations remain full throughout, including the fault.
- [Final native inventory and hashes](evidence/p2-native-final.json): exact model still installed, loopback listener only, PROCESSOR 100% GPU/context 8192; original `macro-schema.ts`, `page-agent-config.ts`, `fixture-agent.ts`, `llm/provider.ts` SHA-256 values unchanged from P1. A final separate board snapshot shows 7411 MiB/56% compute; the 7368 MiB model-series peak above is scoped to its own recorded samples.

No new dependencies were installed. Existing React, WXT, TypeScript, Zod, Vitest, JSDOM, playwright-core and Alibaba packages were reused; the existing transitive Rolldown bundles test-only TypeScript for the native runner. Existing model inventory, including the unrelated older model, remains preserved. This folder is not a Git checkout, so a Git diff/commit was not available and no publication was attempted.

## Files created or modified

Created:

- `src/risk/{categories,schema,prompt,batching,provider,evidence,scoring,orchestrator,test-exports}.ts`: independent risk pipeline and test-only exports.
- `src/extension/analysis-state.ts`, `src/extraction/p2-expectations.ts`, `tests/unit/risk.test.ts`.
- `fixtures/p2/scenarios.json` and eight HTML fixtures (`renewal`, `sharing`, `denial`, `cancellation`, `ambiguous`, `injection`, `safe`, `long`).
- `scripts/{load-risk,probe-risk,test-risk-model,test-p2-browser,report-p2}.mjs`.
- `docs/{risk-analysis,evidence-validation,scoring,p2-verification}.md`; raw model, GPU, browser, failure and verification artifacts under `docs/evidence/p2-*`.

Modified:

- `entrypoints/background.ts`, `src/extension/protocol.ts`, `src/ui/App.tsx`: authorized analysis, cancellation, lifecycle checkpoints and report UI. Scan completion now releases its active session before publishing the terminal result, preventing an analysis-start race.
- `src/extraction/fixture-expectations.ts`, `scripts/serve-fixture.mjs`: independently registered P2 fixture sources; existing extraction logic unchanged.
- `scripts/run-browser-suite.mjs`, `package.json`, `wxt.config.ts`: serial regression/test commands and P2 extension label; permission scope unchanged.
- `README.md`, `docs/architecture.md`, `docs/progress.md`, `docs/performance.md`.

## Development history and remaining limitations

Earlier real series (`p2-model`, `p2-model-final`, `p2-model-verified`, `p2-model-final-schema`) remain intact. They exposed accepted retention false positives, loose string uncertainty, and a missed long-contract renewal. The prompt now explicitly distinguishes storage from deadlines; uncertainty uses typed source-bound objects; the verifier adds the narrow relevance guard. The original long fixture also contradicted its renewal deadline with an unqualified cancel-anytime sentence. Its original HTML and raw model inputs are preserved under `p2-model-final-schema/`; the final fixture uses support-hours/consent text without that contradiction. Results from different fixtures/configurations are not pooled into the final performance figures.

No claim of universal reliable legal analysis is made. B remains DEGRADED despite the final accepted category results. Negation/consent/exception preservation is prompted and tested, not mathematically guaranteed. General websites remain UNKNOWN/PARTIAL; browser session storage is transient, with no persistent report database or background resume. Page Agent is used only by preserved navigation workflows, never by P2 classification. Existing upstream disabled experimental eval bundler warnings remain; extension CSP does not enable eval and dangerous agent actions remain removed.

## Reproduce

From `C:\Users\Emre\Desktop\nurettin\Challenge3`, reuse the existing installation/model. Do not pull another model or reinstall the runtime.

```powershell
$env:DEBUG = ''
npm run ollama:start
$taskOllama = (Resolve-Path .local\ollama\ollama.exe).Path
& $taskOllama --version
& $taskOllama list
nvidia-smi
Get-NetTCPConnection -LocalPort 11434 -State Listen
npm run typecheck
npm test
npm run build
Remove-Item Env:\CLAUSEGUARD_P1_FAST_ONLY -ErrorAction SilentlyContinue
npm run test:browser
$env:CLAUSEGUARD_RISK_EVIDENCE_DIR = 'docs/evidence/p2-model-reproduction'
npm run test:risk:model
npm run report:p2 -- docs/evidence/p2-model-reproduction
& $taskOllama ps
nvidia-smi
```

`test:risk:model` intentionally exits nonzero on semantic degradation; inspect its report rather than interpreting an exit code as a runtime crash. The final observed run was DEGRADED. `test:browser` runs P2, P1 and original P0.1 serially using the existing browser; no inference suites should run in parallel. `report:p2` accepts the evidence directory as its first argument. For UI use, run `npm run fixture` in another terminal, load the extension, open `/p2/renewal.html`, choose **Belgeyi Tara**, then **Risk Analizi Yap**. The mandatory disclaimer is “Bu uygulama hukuki tavsiye vermez.” Stop at P2; P3 requires a new user instruction.
