# P0 verification report

## P0.1 latest verification — 9 October 2026

The original P0 report below is preserved as historical evidence. The current
implementation adds a supported response grammar using the real Alibaba macro's
unchanged action definitions, requiring its existing reflection fields and action.
See [the complete reliability investigation](page-agent-reliability.md).

| Current gate | P0.1 status | Evidence |
| --- | --- | --- |
| Environment | PASS | Same installed exact model, Ollama 0.40.0 and RTX 4060; no stack reinstall or version/model change |
| GPU / 8192 | PASS | All ten real tasks sampled at 100% GPU; independent 512-token check 40.330 tok/s ([GPU report](evidence/p0.1-gpu-8192/gpu-benchmarks.json)) |
| Browser | DEGRADED overall | Actual unpacked Chromium MV3 interaction PASS; manual Chrome toolbar BLOCKED by unavailable native pipe/UI surfaces ([manual evidence](evidence/p0.1-manual-ui.json)) |
| Alibaba Page Agent fixture reliability | PASS — tested supported JSON route | **10/10** real DOM and final-outcome passes, zero retries/invalid outputs; native tool_calls remain DEGRADED ([final series](evidence/p0.1-final/browser-integration.json)) |
| Safety | PASS for fixture boundary | Same real click/scroll/done allowlist, removed-button fault blocked, unauthorized sender/page messages rejected, SW-only requests ([security](evidence/p0.1-final/browser-security.json)) |

Contemporaneous unchanged baseline: **5/10**, 12 retries, 16 invalid outputs.
Rejected exact-schema-only candidate: **0/10**, premature done and hidden DOM.
Final reflection-required grammar: **10/10**, twenty real executed calls, mean
9.776 s / median 9.847 s. Separate expected safety fault: task FAIL / safety PASS,
3.806 s, one blocked click. All failures remain archived and excluded from claims
of success. Full [arithmetic/trace report](evidence/p0.1-reliability-summary.json).

Typecheck PASS, **37 tests / seven files PASS** (existing 29 plus eight new),
WXT build PASS; final browser command exit 0. The same task/fixture, model,
sampler, retry budget and safe controller were used. No new custom action parser,
cloud provider, script operation, proxy or silent DOM truncation was added.

Latest rebuilt-artifact smoke also passed with the new host-report timestamp
([smoke](evidence/p0.1-final/browser-final-smoke.json)). Final attempt 10 popup and
expanded-fixture screenshots were visually inspected. Model and listener were
rechecked after documentation: [residency](evidence/p0.1-final-residency.json),
[listener](evidence/p0.1-final-listener.json), [inventory](evidence/p0.1-final-models.txt).

New/modified implementation: `src/llm/macro-schema.ts`,
`src/llm/page-agent-config.ts`, `src/extension/protocol.ts`; real-browser capture/
GPU instrumentation in `scripts/test-browser.mjs`; probes in
`scripts/probe-tool-calling.mjs` and `scripts/probe-response-grammar.mjs`; report in
`scripts/report-reliability.mjs`; evidence-directory support in GPU diagnostics;
provider/normalizer/grammar regression tests, package report script, docs and
regenerated historical GPU JSON. Existing project architecture remains intact.

For exact reproduction, see README's P0.1 commands. Run
`node scripts/gpu-diagnostics.mjs --contexts=8192` directly: this avoids the observed
PowerShell npm wrapper dropping flags. The unintended default-context diagnostic
completed before termination, then 8192 was restored; its evidence is retained and not used as the final
single-context benchmark. Stop at P0.1, no P1 or GitHub publication.

## Original P0 record

Executed on the user's native Windows workspace `C:\Users\Emre\Desktop\nurettin\Challenge3`, 9 October 2026, Europe/Istanbul. This report separates actual hardware/browser evidence from mocked unit checks. P0 only; no P1 implementation or GitHub publication.

## Acceptance gates

| Gate | Status | Executed evidence and limits |
| --- | --- | --- |
| A — environment | **PASS** | Native RTX 4060 Laptop / driver 596.49 / 8188 MiB detected; reused portable Ollama 0.40.0 repaired with official CUDA backend; exact authorized tag installed and inventoried. [Environment](evidence/environment.json), [model](evidence/model-show.json), [pull](evidence/model-pull.log). |
| B — GPU | **PASS at 8192; DEGRADED at 16384** | Real 512-token generations, repeated independent nvidia-smi + CLI + API samples. 8192: 100% GPU, 40.244 tok/s, peak compute 100%; 16384: 14% CPU / 86% GPU. CPU-only/mixed operational fixture loads are rejected. [Benchmarks](evidence/gpu-benchmarks.json), [performance](performance.md). |
| C — browser extension | **DEGRADED** | Typecheck and WXT build pass. Actual unpacked MV3 extension loaded in existing Chromium 153.0.8010.12; rendered popup, ISOLATED content script, Service Worker, session port and local inference communicated. Automated Chromium portion **PASS**. Manually operated branded Chrome installation / toolbar popup **BLOCKED (unverified)**: no such enabled UI surface or installed executable was available. [Browser environment](evidence/browser-environment.json), [browser results](evidence/browser-integration.json). |
| D — Alibaba Page Agent | **DEGRADED** | Real official packages 1.12.4, no demo model. Real selected DOM click and done completed 4/5 final ordinary tasks (80%). Native tool calls malformed; upstream content-JSON normalization enables successful calls. One task exhausted retries. Safe stale-target test blocked and aborted as expected. [Responses](evidence/page-agent-responses.json), [attempts](evidence/browser-integration.json). |
| E — safety | **PASS for the implemented fixture boundary** | Actual registry only click/scroll/done; original element/index guard; no page API/bridge exposed; unauthorized content-script START_TEST rejected; page postMessage ignored; unrelated control untouched; actual model requests from Service Worker only; exact loopback listener/origin, strict fixed endpoint/model messages. [Security](evidence/browser-security.json), [listener](evidence/final-listener.json), [manifest](../.output/chrome-mv3/manifest.json). General adversarial-page security has not been claimed. |

No untested gate is marked PASS. P0 is implemented and measured with explicit degraded outcomes; it is not represented as fully reliable production readiness.

## Checks run

| Command / check | Result |
| --- | --- |
| `nvidia-smi` and repeated generation sampling | PASS; RTX and actual nonidle CUDA compute captured |
| `.local\ollama\ollama.exe --version`, `list`, `ps` | PASS; 0.40.0, exact model and native residency confirmed |
| `npm run gpu:diagnostics` | Completed all 3 contexts; 4096 PASS, 8192 PASS, 16384 DEGRADED; no OOM / input truncation found |
| Native final preload / `/api/ps` | PASS; model restored to 8192, total size equals size_vram 5,602,415,738 bytes ([final residency](evidence/final-residency.json)) |
| `npm run typecheck` | PASS, exit 0 ([log](evidence/typecheck.log)) |
| `npm test` | PASS, exit 0, **29 tests / 5 files** ([log](evidence/vitest.log)) |
| `npm run build` | PASS, exit 0, MV3 bundle about 583.46 kB ([log](evidence/build.log)); upstream direct-eval warning remains documented and disabled by tool policy/CSP |
| `npm run test:browser` | **DEGRADED, exit 1** because ordinary attempt 4 failed; full 5-task batch + expected safety fault completed and recorded |
| `npm run report:evidence` | PASS; arithmetic summary derived from actual saved JSON ([summary](evidence/summary.json)) |
| `npm audit --json` | PASS, exit 0, zero reported vulnerabilities in the installed graph at test time ([audit](evidence/npm-audit.json)); not a guarantee of upstream behavior |
| Screenshot inspection | Actual final successful attempt 5 popup and expanded fixture PNGs visually inspected; no fabricated screenshots |
| `node scripts/smoke-browser.mjs` | PASS, exit 0; actual latest rebuilt artifact loaded in a fresh browser, popup connected, exact fixture URL and newest diagnostic timestamp confirmed; no extra agent attempt ([result](evidence/browser-final-smoke.json)) |

Unit tests use explicit mocked fetch/process failures and actual Alibaba parsers/registry where relevant. They cover configuration, exact local URL restrictions, extension sender/session authorization, unsafe action removal and element guards, connection failure, missing CLI, model-load failure, invalid/truncated model responses, invalid tool arguments and retry recovery. Their passing result does not prove hardware or real model reliability.

## Real functional criteria and results

The fixture starts with `privacy-policy.hidden=true`. The agent alone chooses `click_element_by_index`, supplies the extracted index, executes real upstream `PageController.clickElement`, observes visible data-sharing text and calls `done`. Passing requires:

1. Initially hidden policy, subsequently visible section and paragraph.
2. Actual successful model-selected click in captured steps; no blocked click qualifies.
3. Correct Section 3 / Data Sharing identification and relevant clause text.
4. Actual done action, final agent success and no context-capacity failure.

The final series gives PASS / PASS after 1 retry / PASS after 2 retries / FAIL / PASS. Ordinary valid executed calls total 9, failed DOM actions 0, retries 5, invalid model outputs 6, completion rate 80%, mean task duration 13.868 seconds. The failed task did open the section but never validly completed; visible DOM alone is insufficient. Recovered errors remain in the report but are not falsely treated as terminal failures.

All 3 native `tool_calls` responses in the final raw capture lacked required action and were rejected. The actual upstream normalizer successfully parsed some of the 13 content-only JSON responses. This is real Alibaba functionality, not an application-created tool workaround; malformed responses are never converted into forced clicks.

The separate sixth test removes the approved button after the real agent begins thinking. Its click guard returns a failed action and the supported lifecycle stop aborts the task in 3.980 seconds. Hidden policy and zero unrelated clicks are verified. That expected task FAIL is a safety PASS and is excluded from ordinary completion rate. No fixture policy click was performed by the test harness or application outside the real agent controller.

## Security verification

Real-browser assertions passed for page-side message rejection, unavailable MAIN-world agent/bridge/runtime APIs, unauthorized START_TEST sent from the actual extension ISOLATED content context, zero unrelated button clicks, real registered tool allowlist, and Service Worker provenance of every model request. Unit tests additionally exercise invalid/expired sessions, incorrect tab/frame/document/origin, request budget and concurrent-request rejection, wrong providers/models, invalid schemas and payload shapes.

Observed Ollama listener is only `127.0.0.1:11434`. The sole configured trusted extension origin is `chrome-extension://fdgkmcbkamaabgmhknfogdanihanhenp`. Ollama also retains its own default local/app origins; no unrestricted custom origin or extension wildcard was added. Its internal runner's defaults are separate from the guarded extension transport and runner listener remains local. No sensitive API key, real personal data, form submission, account action, arbitrary JS tool or unrelated-tab automation exists in this prototype.

## Resolved failures and preserved history

- Missing portable GPU backend was diagnosed from actual logs and fixed with official CUDA DLLs, not an unneeded Toolkit installation.
- f16 cache caused CPU offloading at 8192; q8 cache plus Flash Attention restored measured full GPU residency without changing model quantization.
- Real SW preload returned 403 until its exact observed extension origin was permitted. No wildcard CORS fix.
- Alibaba's automatically inserted DashScope `enable_thinking` field failed strict local transport validation; supported request transform now uses Ollama's documented setting.
- Automated popup had no toolbar activeTab grant; explicit exact fixture host permission permits URL inspection. Production arbitrary-page behavior is not implied.
- Old Chromium persistent profile reused stale background validation code; tests now use a fresh profile every invocation.
- Historical retry errors incorrectly failed recovered completion; corrected final-result/DOM criteria preserve error telemetry.
- Stale approved element initially caused repeated blocked calls; original-element guard plus supported cooperative stop now aborts promptly.
- Malformed real model responses persist. They are recorded, bounded by retries, and honestly classified as degraded tool compatibility.

Archives: [initial real batch](evidence/browser-before-stale-stop/), [temperature-zero failures](evidence/browser-temperature-zero/), [final-settings uncorrected reporter](evidence/browser-final-settings-before-report-fix/), plus named setup/CORS/schema/stale-worker failure JSONs. They are not overwritten to manufacture success.

## Remaining work and precise manual verification

Remaining P0 limitation: **native structured tool calling is not reliable** on this model/runtime/schema combination. The existing model can drive real safe Page Agent tasks, but not every attempt completes. General-page behavior, larger DOM/history context, streaming, multimodal inputs and manual Chrome toolbar operation are unverified. No paid API/model replacement is authorized.

To resolve the manual Chrome item without changing P0 code:

```powershell
Set-Location C:\Users\Emre\Desktop\nurettin\Challenge3
$env:DEBUG = ''
npm ci
powershell -NoProfile -File scripts/start-ollama.ps1
.local\ollama\ollama.exe --version
.local\ollama\ollama.exe list
nvidia-smi
npm run gpu:diagnostics
npm run typecheck
npm test
npm run build
npm run fixture
```

Load `.output\chrome-mv3` from `chrome://extensions` in Developer mode, copy its actual ID, then run in another PowerShell window:

```powershell
powershell -NoProfile -File scripts/start-ollama.ps1 -ExtensionId YOUR_ACTUAL_EXTENSION_ID -Restart
```

Open the exact fixture URL, reload it, use the real toolbar popup Test Page Agent button, watch hidden policy become visible through the agent, and verify last result includes the actual section. Repeat five times; retain failures. During a test inspect `.local\ollama\ollama.exe ps` and `nvidia-smi` repeatedly, not just an idle snapshot. If GPU is mixed/CPU or task fails, report that result.

Independent automated reproduction:

```powershell
npm run test:browser
npm run report:evidence
Get-Content docs/evidence/summary.json
Get-NetTCPConnection -LocalPort 11434 -State Listen
```

The browser harness uses existing cached Chromium or `CLAUSEGUARD_CHROME`; it never downloads a browser. It stores raw fixture-only prompts/responses for development. Use README's exact authorized-model inventory/pull conditional on a fresh machine. Stop here at P0.

## Files created in Challenge3

All source/configuration files were created in the requested initially empty project folder:

```text
.gitignore
package.json
package-lock.json
tsconfig.json
vitest.config.ts
wxt.config.ts
entrypoints/background.ts
entrypoints/content.ts
entrypoints/popup/index.html
entrypoints/popup/main.tsx
src/core/config.ts
src/core/results.ts
src/extension/protocol.ts
src/extension/local-fetch.ts
src/llm/provider.ts
src/llm/page-agent-config.ts
src/agent/policy.ts
src/agent/fixture-agent.ts
src/ui/App.tsx
src/ui/style.css
fixtures/fixture.html
fixtures/fixture.js
scripts/start-ollama.ps1
scripts/install-nvidia-backend.py
scripts/gpu-diagnostics.mjs
scripts/lib/runtime.mjs
scripts/serve-fixture.mjs
scripts/test-browser.mjs
scripts/smoke-browser.mjs
scripts/report-evidence.mjs
tests/unit/config.test.ts
tests/unit/messaging.test.ts
tests/unit/policy.test.ts
tests/unit/provider.test.ts
tests/unit/runtime.test.mjs
public/gpu-verification.json
README.md
docs/architecture.md
docs/performance.md
docs/p0-verification.md
docs/progress.md
docs/evidence/* (actual JSON, logs, screenshots and historical archives)
```

Generated local runtime is in `.local/ollama`; generated WXT types/output are
in `.wxt/` and `.output/chrome-mv3/`. Only authorized model blobs were added to
the reused sibling model store; no existing project source or model was deleted.

Installed dependency versions: WXT 0.21.4, its React module 1.2.2, TypeScript
5.9.3, React / React DOM 19.2.0, Zod 4.5.1, all three Alibaba packages 1.12.4,
Vitest 5.0.3, jsdom 26.1.0, playwright-core 1.64.0, @types/node 22.20.5,
@types/react / @types/react-dom 19.3.0. The lockfile records the full graph.
