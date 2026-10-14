# ClauseGuard performance — measured on 9 October 2026

The P1 continuation measurements appear after the preserved P0/P0.1 benchmark record below. P1 did not repeat native benchmarking or change model/GPU configuration.

## P2 native risk analysis

Final evidence is in [P2 verification](p2-verification.md) and [summary](evidence/p2-summary.json). Same RTX 4060 Laptop / 8188 MiB / driver 596.49 / approximately 31.75 GiB RAM, Qwen3.5 9B Q4_K_M, Ollama 0.40.0, context 8192 and q8_0 Flash Attention cache; no configuration upgrade. All 199 loaded samples show full GPU residency, peak board VRAM 7368 MiB and peak utilization 100%. Across 99 native calls: 4277 generated tokens, 113.703 s generation (37.616 tokens/s), 29.116 s prompt processing and 146.553 s native total. Actual maximum prompt 1149 tokens; maximum conservative estimate 6633 plus 1536 output fits 8192. Warm load timings remain in raw responses, not a cold-start benchmark.

Ordinary scenario wall times range from 0.590 s (denial) to 15.279 s (cancellation). The long contract processes all 183 chunks/52,092 characters in 90 batches and 69.403 s. Conservative byte-based budgeting increases request count. Model semantics remain DEGRADED: three incorrect retention proposals rejected, scoring withheld in those experiments. No CPU fallback or context truncation was measured. Original navigation performance and larger-context limitations below remain historical evidence, not P2 reruns.

## P0.1 latest measurements

Model/runtime/GPU configuration is unchanged: qwen3.5:9b-q4_K_M, Ollama 0.40.0,
8192, Flash Attention and q8_0 KV cache. The accepted output grammar requires the
existing reflections plus action and keeps the actual Alibaba action schemas.
All task figures below use the same unchanged task and fixture and include all
ordinary attempts, including failures.

| Series | Success | Mean task s | Median task s | Retries | Invalid model responses |
| --- | ---: | ---: | ---: | ---: | ---: |
| Historical P0 | 4/5 (80%) | 13.868 | Not recomputed here | 5 | 6 |
| P0.1 unchanged baseline | 5/10 (50%) | 14.031 | 15.619 | 12 | 16 |
| Rejected original-schema-only grammar | 0/10 (0%) | 3.493 | 3.060 | 0 | 0 — schema-valid premature done |
| P0.1 final reflection-required grammar | 10/10 (100%) | 9.776 | 9.847 | 0 | 0 |

The final series performs twenty real actions (one click and one done per task),
with correct Section 3 and a verified fixture quotation in every result. Native
tool_calls count is zero; all twenty ordinary responses use valid plain JSON
accepted by the official Alibaba normalizer. The separate safety fault adds one
response/blocked click and stops in 3.806 s. A short failed task is not a speed
success. No statistical/general-site reliability guarantee follows from ten tasks.

During each real final task, 13–16 samples confirmed CLI 100% GPU and API actual
context 8192 / full residency. Peak compute was 97–100%; occupied board VRAM
7051–7057 MiB includes desktop applications. Model size and size_vram both remain
5,602,415,738 bytes. Successful prompt counts were 3257 on the first step and
3524–3534 on completion, with 99–115 and 170–210 generated tokens respectively.
No successful context approached exhaustion; no essential page data was shortened.

The independent final **8192-only** native benchmark:

| Field | Measured |
| --- | --- |
| GPU / CPU residency | 100% / 0% |
| Prompt / generated tokens | 3866 / 512 |
| Generation / prompt tok/s | 40.330 / 1857.387 |
| Load / native total / wall s | 3.263 / 18.069 / 18.196 |
| Peak board VRAM / compute | 7042 MiB / 100% |
| Samples | 24 total; native raw residency evidence retained |
| Markers / input truncation / OOM | Both returned / none observed / none observed |

See [8192 measurements](evidence/p0.1-gpu-8192/gpu-benchmarks.json),
[all reliability statistics](evidence/p0.1-reliability-summary.json) and
[full investigation](page-agent-reliability.md). Generation throughput remained
approximately 40 tokens/s; its small difference from P0 is not a proven speed gain.
No CPU-only execution was accepted. The npm wrapper's unintended default-context
run is recorded separately in `p0.1-gpu/`; 8192 was restored and explicitly rerun.

## Original P0 measurements (preserved)

All numbers below are executed native Windows measurements. Raw evidence is in [gpu-benchmarks.json](evidence/gpu-benchmarks.json), [summary.json](evidence/summary.json), individual context files and [Ollama logs](evidence/ollama-server.log). No synthetic benchmark or alternative model was used.

## Hardware and runtime

| Field | Observed value |
| --- | --- |
| GPU | NVIDIA GeForce RTX 4060 Laptop GPU, compute capability 8.9 |
| VRAM | 8,188 MiB reported by nvidia-smi |
| System RAM | 34,087,772,160 bytes / 31.75 GiB (nominal 32 GB system) |
| NVIDIA driver | 596.49; nvidia-smi reports CUDA compatibility 13.2 |
| Ollama | Native Windows portable 0.40.0, llamacpp runner, official CUDA 13 backend |
| Model | `qwen3.5:9b-q4_K_M`, 9.0B, qwen35 |
| Quantization | Q4_K_M model weights; unchanged throughout |
| Model digest | `56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90` |
| Installed model | About 6.6 GB including vision projector; inventory captured, no vision input used |
| Server | `127.0.0.1:11434`, cloud disabled, one sequence / one loaded model |
| Operational configuration | 8192 context, Flash Attention enabled, q8_0 KV cache |

The initial reused runtime lacked NVIDIA DLLs and logged no detected VRAM. We downloaded only the missing official version-matched CUDA backend, then only the authorized model. No separate CUDA Toolkit, embedding model, quantization replacement or other LLM was installed. Existing `qwen3:4b` remains present and was not used or deleted.

## Final context experiments — q8_0 KV cache

Each experiment unloads the same model, loads the requested context, processes a distinct fictional long prompt, generates 512 tokens, and samples the GPU and model residency repeatedly (750 ms target interval). No concurrent agent inference runs during these measurements.

| Context | Gate | GPU / CPU residency | Prompt tokens | Generated | Generation tok/s | Prompt tok/s | Load s | Total s | Peak board VRAM MiB | Peak GPU compute | Samples / loaded |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 4096 | PASS — baseline | 100% / 0% | 977 | 512 | 40.675 | 1559.091 | 3.315 | 16.538 | 6906 | 96% | 22 / 17 |
| 8192 | PASS — operational fixture | 100% / 0% | 3866 | 512 | 40.244 | 1861.253 | 3.276 | 18.104 | 6978 | 100% | 24 / 19 |
| 16384 | DEGRADED | 86% / 14% | 9326 | 512 | 29.599 | 1679.725 | 4.772 | 27.682 | 6934 | 100% | 37 / 30 |

Wall-clock durations, including diagnostic sampling overhead, were 16.683, 18.230 and 27.830 seconds respectively. Timing formulas are the native API's token counts divided by its prompt/evaluation durations; load and total durations are native nanoseconds converted to seconds. They are individual measurements, not statistical throughput guarantees.

| Context | API total loaded model memory bytes | API size_vram bytes | CLI interpretation |
| ---: | ---: | ---: | --- |
| 4096 | 5,526,918,266 | 5,526,918,266 | 100% GPU |
| 8192 | 5,602,415,738 | 5,602,415,738 | 100% GPU |
| 16384 | 6,461,188,992 | 5,525,943,089 | 14%/86% CPU/GPU |

`nvidia-smi` values are total occupied board memory, including desktop applications; Windows WDDM reports individual process memory as N/A. They are not interchangeable with `/api/ps` model memory. The logs independently identify the CUDA backend and RTX device and record all 33/33 model layers offloaded for full-residency loads. Host/pinned buffers and CPU orchestration still exist even when the CLI labels model residency 100% GPU.

Both beginning and ending prompt markers were returned in every final experiment. API token totals fit the requested contexts, and inspected runner logs report untruncated input; no OOM or prompt-truncation error was found in the captured run. All diagnostic generations intentionally hit the **512 output-token cap**, which is not input truncation. This does not certify all future longer legal pages or tool schemas.

4096 proves GPU acceleration only. 8192 is the practical tested P0 setting: it fits the real fixture, tool schema, and short multi-step history on the GPU. 16384 works with CPU offloading and about 26% lower generation throughput than 8192; it is not accepted as full-GPU operational success. Eight GB VRAM does not guarantee every context fits.

## Optimization history — preserved measurements

Before q8 KV caching, the f16 baseline gave:

| Context | GPU / CPU | Generation tok/s | Prompt tokens | Generated | Load s | Total s | Peak VRAM MiB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 4096 | 100% / 0% | 40.265 | 975 | 512 | 27.181 | 57.350 | 7176 |
| 8192 | 88% / 12% | 33.959 | 3864 | 512 | 4.551 | 21.855 | 7182 |
| 16384 | 84% / 16% | 26.501 | 9324 | 512 | 5.041 | 30.178 | 7158 |

See [baseline-f16](evidence/baseline-f16/) for exact samples and logs. The first cold run included CUDA initialization / JIT cost; its prompt throughput was only 55.953 tok/s, unlike later warm-cache experiments. q8 caching first restored full 8192 residency at 40.125 tok/s ([optimized-q8](evidence/optimized-q8/)). That earlier run occupied about 7698 MiB board memory. A later restart fix removed orphan project-owned unloaded runner processes; the final serialized repeat above occupied less board memory. These are separate measurements, not an unexplained guarantee of constant VRAM usage. The final marker prompt was also adjusted to request both markers first rather than after a long output.

## Actual Alibaba Page Agent performance

Real packages 1.12.4 ran in the built MV3 ISOLATED content script in cached Chromium 153.0.8010.12. Requests used only local Ollama, no demo or paid/cloud provider. All six final sessions independently reported **8192 / 100% GPU** in both CLI and API residency captures.

Final sampler settings: thinking disabled with `reasoning_effort:none`, temperature 0.2, presence penalty 0, max output 1536, maximum two library retries per inference. The fixed task requires opening the policy and returning Section 3 / Data Sharing with clause text.

| Attempt | Completion | Task seconds | Executed calls | Failed DOM calls | Retries | Invalid tool responses | Observed DOM |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | PASS | 9.659 | 2 | 0 | 0 | 0 | Hidden → visible; correct clause; done |
| 2 | PASS after retry | 13.424 | 2 | 0 | 1 | 1 | Hidden → visible; correct clause; done |
| 3 | PASS after retries | 19.160 | 2 | 0 | 2 | 2 | Hidden → visible; correct clause; done |
| 4 | FAIL | 17.045 | 1 | 0 | 2 | 3 | Opened, but no valid done / final clause result |
| 5 | PASS | 10.054 | 2 | 0 | 0 | 0 | Hidden → visible; correct clause; done |
| 6, removed-button safety fault | Expected FAIL; safety PASS | 3.980 | 1 | 1 | 0 | 0 | Guard blocked stale element; policy stays hidden; aborted |

Ordinary completion: **4/5 = 80%**, mean 13.868 seconds; 9 executed valid calls, zero failed ordinary DOM actions, five retry events and six invalid model responses. Fault injection is excluded from completion rate. Every successful task used the real model-selected click and real `done`; neither rendered text alone nor an already-open DOM is accepted.

The final network capture contains 16 actual HTTP 200 model responses including the fault: three native `tool_calls` responses and thirteen content-only responses. **All three native calls omitted required `action` and were rejected.** Successful actions came from the real Alibaba upstream normalizer parsing model-emitted JSON in message content, sometimes containing `</tool_call>` wrapping. Some remaining content-only responses were also invalid. Thus the tool definitions are accepted and real agent actions can execute, but native structured tool calling is unreliable in this exact combination. No application shim fabricates actions.

The tool schema, requests, native/fallback responses, actual activities and DOM assertions are retained in [page-agent-network.json](evidence/page-agent-network.json), [page-agent-responses.json](evidence/page-agent-responses.json), [browser-integration.json](evidence/browser-integration.json) and per-attempt JSON/PNGs. Successful steps used roughly 3257–3528 prompt tokens and 100–210 completion tokens; no successful step approached context exhaustion.

Earlier real runs are preserved: the first complete fixture batch passed 3/3 without retries; a later temperature-zero raw-response batch passed only 1/3, with malformed reflection-only arguments. Setup failures (CORS, Qwen vendor field, cached stale Service Worker) are also retained and were fixed. The uncorrected reporter once counted recovered errors as terminal; its batch is explicitly archived and not used for the final 80% rate.

**Page Agent reliability is DEGRADED.** More retries are not a guarantee. P0 proves local full-GPU fixture feasibility and actual safe DOM interaction, not dependable general-purpose browsing or finished risk analysis. Future work must address this model/runtime/native-schema compatibility with explicit additional authorization before changing the model. CPU-only operation is rejected; no cloud fallback is implemented.
# P1 continuation measurements — 9 October 2026

P1 does not repeat the native context benchmark or change Ollama/model/cache settings. The historical P0/P0.1 measurements below remain distinct. New real browser evidence: [summary](evidence/p1-summary.json), [P1 integration](evidence/p1-verified/integration.json), [repeated GPU samples](evidence/p1-verified/gpu-samples.json), [original regression](evidence/p1-p0.1-verified/browser-integration.json).

| P1 field | Executed result |
| --- | --- |
| GPU / driver | RTX 4060 Laptop / 596.49 |
| Model / quantization / runtime | qwen3.5:9b-q4_K_M / Q4_K_M / Ollama 0.40.0, unchanged |
| VRAM / system RAM | 8188 MiB board capacity / 31.75 GiB, prior inventory; P1 board peak 7060 MiB |
| Context / GPU / CPU residency | 8192 / 100% GPU / 0% CPU in all 87 loaded ordinary SLOW samples |
| Model memory reported by /api/ps | size = size_vram = 5,602,415,738 bytes; board memory also includes caches/projector/other GPU activity |
| Prompt / generated tokens | 47,315 / 1,969 summed across fourteen ordinary SLOW steps; max combined per step 3962, below 8192 |
| Inference tokens per second / native load time | Not remeasured in P1. Historical P0.1 native 8192 benchmark: 40.330 tokens/s, 3.263 s load |
| FAST duration | 12 outcomes, engine mean 5.208 ms, range 1.4–26.9 ms; zero inference requests/agent invocations |
| SLOW total engine duration | 5/5, mean 12.851 s; hidden 7.551–9.594 s, three-section 16.361–21.817 s |
| SLOW tools / failures / retries | 14 actual actions (9 clicks + 5 done), zero failed ordinary tools, zero retries |

Engine duration includes extraction/discovery/re-extraction but excludes popup load and injection. Per-case wall duration includes popup activation and polling; it is separately retained in JSON. These task durations are not pure model token throughput. The final-built-artifact FAST check is a separate series after a terminology-only update and is not pooled into the measured full suite above. No P1 context-size sweep was performed; previous 16384 CPU-offloading remains a historical limitation. Full GPU at 8192 does not guarantee full residency at every context or under other VRAM loads. The live guard still refuses mixed/CPU residency.



## P4 fresh full-source experiment (13–14 October 2026)

This is the recovered 246-call run, not the earlier interrupted experiment or cached replay. GPU RTX 4060 Laptop; total VRAM 8188 MiB; RAM target 32 GB (Windows measured 31.75 GiB); driver 596.49; Ollama 0.40.0; existing qwen3.5:9b-q4_K_M / Q4_K_M; unchanged context 8192, Flash Attention, q8_0 KV, one sequence/model. Native log confirms CUDA0 and 33/33 layers offloaded.

2948 independent samples: full model GPU residency confirmed by PROCESSOR/API plus independent VRAM consistency, 0% CPU model residency observed, peak VRAM 7383 MiB for the whole GPU, peak compute 100%. CPU orchestration/tokenization remains. No 4096/16384 retest or CPU/mixed fallback.

All response metrics, including failed output-limit responses: prompt tokens 247730, generated tokens 114116, generation 39.962 tokens/s, reported warm load sum 1960.619 ms; total analysis 2975.023 s (49.584 min). Cold model load was not separately benchmarked. 242 planned batches, 238 completed, four failed; eight 1536-token incomplete JSON responses were rejected. 757/780 source chunks analyzed. All real-site scores withheld.

Before dedup: 176 valid evidence proposals, 129 rejected; 169 unique accepted findings, which do not imply semantic correctness. Eight frozen reference labels remain pending human review: TP4/FP6/FN4, precision40%, recall50%, F144.4%, PROVISIONAL. Full analysis is slow; verbose output and bounded repeated output-limit failures dominate cost. Exact quoting, qualified interpretation and ambiguous retention remain limitations. Page Agent passed twelve controlled adversarial DOM tasks with seven safe tool failures; this does not certify arbitrary websites.

The interrupted earlier runtime loss left stale GPU metadata; it is preserved and explicitly excluded from final GPU success. See p4-verification.md and runtime-interruption.json. Cached eval:real runs make zero new inference calls and do not collect new GPU measurements.
