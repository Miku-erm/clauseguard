# ClauseGuard progress

## 13 October 2026 — P3 Turkish extension UI

- Preserved existing extraction/reflex, risk schema/evidence/scoring, exact Qwen model, Ollama 0.40.0, quantization, 8192/GPU configuration and official Alibaba grammar/normalizer. Added only Tailwind CSS/Vite 4.3.3 direct UI build dependencies.
- Added Turkish popup workflow, full responsive report, settings and typed UI session/command boundaries. Reports use opaque job IDs, exact source identity and engine scores; missing/ineligible scores remain null with explanations.
- Added exact text-node Range navigation, current source hash/document re-extraction, unique locator checks and temporary CSS Custom Highlight with actual style verification. Changed/closed/ambiguous sources are refused, not falsely highlighted.
- Verified popup closure/reopening, cancellation, navigation and worker interruption through real MV3; added synchronous operation reservation for concurrent popup requests. A real final regression exposed an old diagnostic completion race; cleanup now precedes terminal publication, and the final P0.1 run passes. The failing run is retained.
- Public activeTab grant verified with documented Chromium CDP action: Wikimedia extraction 405 chunks/41,002 characters, PARTIAL, zero LLM/agent calls. Mozilla Privacy Notice is not recognized by unchanged P1 rules; recorded DEGRADED. Manual branded Chrome remains BLOCKED because no available installation/app was found.
- Real offline and installed-but-unloaded Ollama states passed without transport mocks; the project-owned server was restored. Fresh native series: 99/99 valid responses, zero invalid/retries, nine accepted findings, one rejected proposal, zero accepted category false positives and one missed renewal finding in the injection case. Semantic detection remains DEGRADED.
- Native GPU: 177 loaded samples, full 8192 GPU residency, 7171 MiB peak board VRAM, 100% peak compute, 39.632 generation tokens/s across all 99 requests. Long source still fully processes 183 chunks/52,092 characters in 90 batches/70.680 s.
- Final typecheck PASS, 113/113 Vitest tests PASS, WXT build PASS. Final full browser command remains exit 1 on the retained semantic injection assertion; P2 seven-case suite, P1 twelve FAST/five SLOW and original P0.1 three tasks plus expected faults pass. No assertion weakened to obtain a green command.
- Rejection and long-report display replays use preserved real responses with checked source versions and explicitly do not count as fresh inference. Actual screenshots inspected; failed development/model/browser evidence preserved. Created UI architecture/workflow/P3 verification and updated README/architecture.
- Stop after P3. No P4, final five-site evaluation, MCP, llms.txt, Cypress video, cloud inference, AI model/runtime download or publication.

## 9 October 2026 — P1

- Continued `Challenge3`; no dependency/runtime/model reinstall, no extra model, cloud provider, Jev, llms.txt or MCP. P0.1 grammar/normalizer, GPU defaults and original fixture agent remain unchanged.
- Added strict source/document schemas, DOM boundaries, English/Turkish hints, semantic chunking, source-node locations, deterministic version hashes, duplicate handling and explicit conservative coverage.
- Added bounded deterministic reflex states, read-only FAST, approved-fixture real Alibaba SLOW, cancellation/stale document handling, user-triggered ISOLATED injection and session-memory evidence UI with “Belgeyi Tara”. Only new permission is scripting, with activeTab; loopback host grants remain unchanged.
- Added ten controlled HTML cases plus two unregistered aliases. The 180-clause long agreement is fully extracted into 181 chunks / 44,548 original characters without model-context truncation. Prompt injection remains source data, never a routing instruction.
- First tests exposed corrupted Turkish fixture characters from Windows pipe encoding; repaired generated files with explicit Unicode escapes. First browser safety series blocked a removed target but reported INSUFFICIENT; corrected to FAILED with retained actual activity. A separate harness default-value mistake asserted COMPLETE on expected failed faults; corrected the test expectation. Both early browser evidence directories (`p1/`, `p1-final/`) remain as failed records rather than being presented as passes.
- Verified full suite: twelve FAST outcomes with zero inference requests, five/five SLOW completions, fourteen real tools/calls, zero retries/failed ordinary tools, 276 exact-source checks without mismatch. Removal, cancellation and navigation each fail safely. Eighty-seven SLOW GPU samples confirm full residency at 8192, peak board memory 7060 MiB and compute 100%.
- Original P0.1 regression passes three/three plus expected removed-button safety failure. Strict typecheck, 57 Vitest tests and WXT build pass. Final small identification change adds Turkish “Abonelik Şartları” and reports landing-page legal-link hints; final build is checked separately without repeating expensive AI benchmarks.
- Detailed gates, evidence and reproduction are in `p1-verification.md`. Manual branded Chrome toolbar and arbitrary-site activeTab workflows remain unverified. Stopped at P1; no risk scoring or P2 work, no GitHub publication.

## Historical P0/P0.1 record

P0 only: infrastructure, NVIDIA measurements, extension messaging and a constrained
Alibaba Page Agent fixture experiment. No legal risk scoring, production crawling,
cloud provider, embedding model, account automation or P1 work.

## 9 October 2026 — initial inspection

- Work directory: `Challenge3` (initially empty).
- Native Windows host, Node 22.16.0, npm 10.9.2, Python 3.10.0.
- NVIDIA RTX 4060 Laptop GPU detected; driver 596.49; 8,188 MiB dedicated VRAM.
- Total physical RAM: 34,087,772,160 bytes (31.75 GiB).
- Ollama was missing from PATH. Reusable official portable CLI 0.40.0 discovered
  in `../Challenge2/.local/ollama`; existing `qwen3:4b` was inventoried and left intact.
- Previous portable runtime contained only CPU binaries. Its log reported zero
  detected VRAM. This is an actual missing-backend problem, not a driver assumption.
- Reuse shallow runtime files in a project-local installation and download only
  the official CUDA 13 backend using ZIP HTTP ranges. Driver reports CUDA 13.2.
  No CUDA Toolkit, ROCm, MLX runtime or additional LLM is installed.
- Pull authorized exact model `qwen3.5:9b-q4_K_M` into existing shared model store.
- Server explicitly binds `127.0.0.1:11434`, cloud disabled, one parallel sequence,
  one loaded model, default context 8192. No CORS wildcard configured.
- Inspected official Alibaba documentation and published npm 1.12.4 exports and
  implementation. `PageAgentCore`, `PageController`, and `tool` are real exports.
  Actual model schema is the `AgentOutput` macro tool with a union of permitted
  DOM actions. Current library uses `response.json()` without streaming.

Final measurements and acceptance gates are recorded in `p0-verification.md` and
`performance.md`; raw evidence is in `evidence/`.

## Executed outcomes

- Repaired the missing GPU backend and completed the exact authorized model pull.
  No other model, embedding model, CUDA Toolkit or browser was downloaded.
- Repeated real native inference at all three required contexts. f16 offloaded at
  8192; q8 KV caching restored full residency without changing Q4_K_M weights.
- Final q8 experiments: 4096 100% GPU / 40.675 tok/s; 8192 100% GPU / 40.244 tok/s;
  16384 14% CPU / 86% GPU / 29.599 tok/s. Both prompt markers survived all final
  experiments, no observed input truncation/OOM, generation intentionally capped
  at 512. Restored the resident model to 8192 after the large-context test.
- Built WXT / strict TS / React / MV3 scaffold and verified actual Alibaba 1.12.4
  extraction, tool registration, native click, events and completion in ISOLATED.
  No MAIN-world bridge was needed. Only Service Worker model network access exists.
- Fixed exact-origin CORS, Qwen request adaptation, fixture URL access, stale
  browser-profile Service Worker reuse, stale-element stop and retry classification.
  Preserved real failures and raw responses rather than manufacturing success.
- Final browser series: 4/5 ordinary tasks completed (80%), with 5 retries and
  6 invalid responses. One task opened the policy but could not finish. Removed
  button fault blocked the actual tool and aborted safely. Tool reliability is
  DEGRADED; no cloud fallback or alternate model was used.
- Verified origin/session boundaries, real content-script sender rejection,
  actual allowed registry and zero unrelated clicks. Cached Chromium 153 tested;
  manual branded Chrome toolbar use remains BLOCKED/unverified.
- Typecheck PASS; 29 tests / 5 files PASS; WXT build PASS; npm audit zero reported
  vulnerabilities. Screenshot PNGs inspected. Latest GPU host report rebuilt into
  popup. Official upstream unused eval warning documented, script tool disabled
  and removed; extension CSP does not allow eval.
- Created README, architecture, performance and complete verification reports,
  reproduction commands and evidence arithmetic script. Stopped at P0; no P1 or
  publication work.

## 9 October 2026 — P0.1 reliability investigation

- Reused existing stack, exact model and Ollama 0.40.0; no install, model download,
  quantization/runtime/driver change or cloud call. Kept server default 8192,
  Flash Attention/q8 cache, same task/fixture/sampler/maxSteps/maxRetries.
- Re-examined installed real macro, request builder, normalizer, schema validation,
  retry history, done detection and Qwen native/XML response behavior. The pinned
  Ollama request handler lacks tool_choice; four real render probes produced the
  same prompt and ignored selection constraints. A simple native Ping works.
- Expanded actual-fixture replay fails identically via native and compatible APIs;
  it produces reflection-only macro arguments. Context/truncation do not explain
  those stop/tool_calls failures. A deliberate eight-token cap is separately
  detected and rejected. Recorded safe fictional request/response shapes only.
- New ten-task unchanged baseline completed 5/10 with 12 retries and 16 invalid
  responses, despite all-full GPU measurements. Historical P0 4/5 remains intact.
- Candidate A adds supported response schema but leaves reflection fields optional:
  0/10, premature done while DOM hidden. The app rejects every result; retained
  this failed candidate rather than calling schema-valid output a pass.
- Candidate B changes only that grammar's required fields to existing evaluation,
  memory, next_goal and action. Matched probes choose correct click/done, then the
  final real browser series completes **10/10**, twenty actual actions, zero
  retries/invalid outputs; mean 9.776 s, median 9.847 s. Official normalizer handles
  complete plain JSON as designed; native tool_calls remain unreliable.
- Every final attempt independently passes click, visible-policy, correct Section 3,
  fixture quotation and done checks. Each has 13–16 repeated samples confirming
  full 8192 GPU residency. Removed-button fault blocks click and aborts in 3.806 s;
  sender/page-message isolation and SW-only transport checks remain PASS.
- Added six actual-core normalization regressions and two grammar regressions;
  all existing tests retained. **37 tests / seven files PASS**, typecheck PASS,
  WXT build PASS. Upstream disabled eval warning still documented.
- Final native 8192-only benchmark: 40.330 generation tok/s, 1857.387 prompt tok/s,
  7042 MiB peak board memory, 100% utilization and full GPU. An npm-wrapper flag
  failure ran default contexts and completed before termination; restored 8192 and reran directly
  with Node. All evidence retained; that run is not the P0.1 benchmark.
- Tried Computer Use: native pipe unavailable (Windows error 2); CUA apps/browsers
  empty; conventional branded Chrome paths/registry unavailable. Manual toolbar
  verification is BLOCKED, automated cached Chromium evidence is separate.
- Added `page-agent-reliability.md`, separate baseline/rejected/final/probe/GPU
  evidence and reproducible arithmetic report; updated README/performance/gates.
  Stopped after P0.1, no P1 or publication.


## 9 October 2026 — P2 source-backed risk analysis

- Read the P2 request and existing P1 source contracts/verification; reused installed dependencies, exact model, Ollama 0.40.0 and GPU settings. No installs, pulls, cloud calls or driver/runtime changes.
- Added eight centralized categories, independent strict Zod/native risk schema, Turkish explanations with exact original quotations, typed source-bound uncertainty, conservative context batching and serial bounded orchestrator.
- Added version/integrity/quote validation, narrow retention relevance rejection, deterministic deduplication/max-per-category integer scoring and complete-only score eligibility. UNKNOWN/PARTIAL, rejected evidence, uncertainty and failed batches withhold score.
- Connected user-authorized popup-only analysis to the fixed native Service Worker endpoint, cancel/deadline/source/navigation checks and explicit worker-interruption checkpoints. Existing P0.1 tool grammar/provider/controller preserved. Added risk UI with disclaimer and real rendered evidence.
- Added seven labeled fixtures plus a 183-chunk/52,092-character long fixture; ran real model experiments and retained all failed candidates. Corrected a contradictory long-fixture sentence while preserving the original source/version evidence.
- Final model series: 99/99 schema-valid responses, zero retries, nine accepted findings, three unsupported retention proposals rejected, no accepted category false positives or required-category misses in the final labeled fixtures. Semantic gate remains DEGRADED; quoting does not establish correct legal interpretation.
- Repeated actual GPU observations: 199 samples, 100% GPU at 8192, peak 7368 MiB and 100% compute; all-call generation 37.616 tokens/s. Long analysis completed in 69.403 s over 90 calls; conservative budgeting trades throughput for explicit coverage.
- Focused real MV3 browser test passed seven analysis/fault cases plus sender/transport isolation. Retained initial CDP capability failure and fixed page-session worker inspection. Final full P2/P1/P0.1 regression results are recorded in p2-verification.md.
- Typecheck, 85 unit tests and WXT build pass. New risk docs and full measured verification/evidence created. Manual branded Chrome/toolbar checks remain BLOCKED. Stop after P2; no P3, MCP, llms.txt, five-site evaluation, Cypress video or publication.

## 13–14 October 2026 — P4 semantic reliability and evaluation

- Investigated and reproduced the unchanged P3 renewal miss. The full clause was extracted/batched/in context; valid empty findings and misrouted uncertainty support MODEL_SEMANTIC_FAILURE. Validator/dedup/budget were not the original cause. Neutral direct controls did not establish causal injection distraction. Original fixture/hash/assertions preserved.
- Updated only the general risk prompt and alternative/multilingual legal-title recognition in production. Protected grammar, provider, batching, scoring, evidence, Reflex and Page Agent hashes are unchanged. No dependencies, models, CUDA, runtime versions, cloud service or publication added.
- Created twelve fictional attack variants; actual Alibaba exploration opened the section in 12/12, native risk retained renewal in 12/12. Actual 43 tool steps included seven safe scroll failures, zero upstream retries, no forbidden payment events. Hidden exclusion is only an extraction boundary; visible paired native probe tested the hidden payload. No universal immunity or real-secret exfiltration claim.
- Collected GitHub, Discord, Reddit, Spotify TR and Dropbox official agreements. Four use actual MV3 read-only FAST extraction; Reddit uses the explicit original US/non-EEA branch snapshot. Versions/regions/hashes recorded, no branch mixing or restriction bypass. Full copyrighted snapshots and traffic stay in ignored .local/p4.
- Froze eight direct-reading references before model predictions; all PENDING_HUMAN_REVIEW. Added prediction-bound provisional semantic review, deterministic maximum-cardinality one-to-one matching, duplicate/empty/missing cases, micro/macro/category/evidence/severity metrics and per-error source-state records.
- Retained failed prompt experiments and an unexpected Windows process termination (1073807364), subsequently attributed by the user to an accidental PC shutdown attempt that they canceled (user-reported; not independently established from logs). Independent NVIDIA 995/897 MiB contradicted stale Ollama 100% GPU metadata; it was not accepted as success. Safely restarted only project-owned Ollama at unchanged settings. Added durable response/GPU journals, bounded diagnostics and exact-request cached response resume; original missing responses were not reconstructed.
- Recovered fresh full-source evaluation: 246 calls, 242 planned batches, 238 complete/four failed, 757/780 chunks analyzed. Eight capped 1536-token incomplete JSON responses rejected; 176 source-valid proposals, 129 rejected, 169 unique accepted. Source-valid is not semantically correct. All real-site complete-document scores withheld.
- PROVISIONAL eight-label metrics: TP4 FP6 FN4; precision40%, recall50%, F144.4%; macro precision46.7%, recall50%, F148%; evidence validity57.70%; severity agreement0%. No label or weight changed to improve a metric. Reference coverage is sparse, unannotated predictions remain unscored.
- Final fresh GPU evidence: RTX4060 Laptop, native CUDA0, 33/33 layers, 8192/Q4_K_M, Ollama0.40.0/driver596.49, 2948 full-residency samples, peak7383MiB/100%compute, 39.962 tokens/s over all responses, 2975.023 seconds for five full snapshots. No CPU/mixed fallback or context/quantization substitution. Actual five-document cache command made zero model calls and no new GPU measurements.
- Original renewal: 3/3 native repeats and dedicated real browser PASS. Nine semantic cases: 8 pass, ambiguous storage produces a risk instead of expected uncertainty; retained exit1/DEGRADED. Repeated selected clauses show one observed category/evidence/severity signature in this small experiment, not guaranteed determinism.
- Mozilla Privacy Notice now recognized (six chunks/1027characters/PARTIAL); Wikimedia remains recognized (405chunks/41002characters/PARTIAL); both zero LLM/agent calls. No arbitrary website permissions or forced COMPLETE coverage.
- Typecheck, 137/137 unit tests and WXT build PASS. P3 original score14 assertion remains failing for actual27, while all12 UI checks ran with verified renewal evidence. Separate P2/P1/P0.1 actual components PASS. Final bounded full-suite outcome is recorded in docs/evidence/p4/full-final/; no failed suite is hidden. Manual branded Chrome toolbar validation remains BLOCKED, separate from actual cached Chromium MV3 tests.
- Added security/evaluation/semantic/performance/P4 verification docs, machine-readable evidence and reproduction commands. Stop after P4. No MCP, llms.txt, final Cypress video, additional model or GitHub publication. Human review, output-budget and qualified interpretation improvements remain recommended before final delivery.

Final bounded npm run test:browser completed all four phases: P3 exit1, P2 exit0, P1 exit0, P0.1 exit0; aggregate exit1. Final P3 renewal score27 consists of automatic renewal14 plus cancellation13, both MEDIUM, rather than a changed weight or arithmetic. All twelve UI checks executed; original renewal assertion remains failing, injection category assertion passes.

## Post-P4 user clarification and shutdown request

Recorded 2026-10-13T23:04:48.699Z: the user explained the interruption as an accidental computer shutdown attempt that they canceled. P4 work and verification artifacts are saved on disk. The user explicitly requested computer shutdown after P4 completion. No further phase or inference is started.

## 14 October 2026 ? P4.1 in progress

- Archived the P4 implementation, original failing assertions, source snapshots and eight frozen references; no label is human verified.
- Independently adjudicated original monthly renewal/no reminder/thirty-day cancellation as two supported disadvantages. Corrected category/formula assertion is versioned; historical failure preserved.
- Added strict one-to-one NBSP/narrow-NBSP span restoration and rejection tests; no fuzzy quote repair. Introduced at most two new chunks per risk batch and adaptive 1536/2048/3072 output reservations without changing the 8192 context, schema, scoring or model.
- Latest deterministic checks: 147 tests, typecheck and build passed. Real-model development runs exposed multiple prompt tradeoffs (false uncertainty, retention/cap misses and overly long input budgets); they are preserved rather than labeled final success. Remaining final model/browser/evaluation results are pending and will be recorded in p4.1-verification.md.
- Prepared eleven review drafts with exact context/URLs/hashes, all pending actual human review. Supplemental items are excluded from baseline metrics; no untouched holdout claim.
- Reused existing model/runtime/dependencies. No new download, cloud backend, registry/startup change, MCP, llms.txt, video, publication or later phase.

## 14 October 2026 — final delivery mission completed

The new mission explicitly allows documented model limitations and reuses recorded five-contract evidence. Added genuine bounded llms.txt discovery/context candidates and real popup navigation, official MCP SDK v2.3.1 stdio adapter with three validated tools and actual client initialization/calls, and short controlled delivery fixtures. Final typecheck/build and 155 deterministic tests pass; actual browser smoke and five HTTP llms scenarios pass. MCP includes actual Qwen analysis, no browser/filesystem proxy.

Cypress recorded real packaged extension UI and background operations, actual Alibaba policy click, genuine Qwen/evidence/scoring and honest UNKNOWN coverage. Final 2/2 scenarios pass. Preserved failed environment/UI-test attempts; did not inject reports or manually perform the source policy click. FFmpeg reused; FFprobe added. Final MP4: 80 seconds, 1800x982 H.264, full decode and direct visual frame review PASS. Raw 83.84-second recording remains local.

README/screenshots, architecture/security/evaluation/final verification and publication exclusions completed. Source and Chrome-MV3 ZIPs verified via inflation/CRC and independent Windows ZIP reader. No GitHub push, new AI model/runtime/GPU settings, full five-source rerun, registry/startup/security change or further optimization phase. Existing semantic failures, provisional labels, six dev-tool advisories and unverified manual toolbar check remain documented.
