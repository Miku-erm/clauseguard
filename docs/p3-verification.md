# Phase P3 verification — 13 October 2026

P3 adds a Turkish popup, detailed report and settings UI to the preserved local extraction/risk pipeline. This is a university prototype with production-oriented UI, not a completed assignment or established legal classifier. Semantic detection remains DEGRADED; exact quotation is not proof of correct interpretation. No P4, five-site gold-label evaluation, MCP, llms.txt, Cypress video or publication occurred.

## Implemented files

Created `src/ui/{presentation,use-session,components,ReportPage,SettingsPage}`, `entrypoints/report/`, `entrypoints/settings/`, `src/extension/{ui-session,ui-protocol,source-navigation}`, `tests/unit/ui.test.ts`, `scripts/test-p3-browser.mjs`, `scripts/test-p3-access.mjs`, and three P3 documents. Modified popup/App/CSS, background session integration, runtime scan script, WXT page/Tailwind registration, package/lockfile, browser-suite runner, README/architecture/progress. The original browser test's two English button selectors were translated to the new Turkish label; its underlying DOM, tool, evidence and security assertions remain intact.

Tailwind CSS and its Vite plugin 4.3.3 are the only newly requested direct dependencies (11 installed packages including transitive UI build support). Existing WXT/React/TypeScript/Vitest/Alibaba/model/runtime versions were retained. No AI package, model, quantization, native context, GPU configuration or risk algorithm was changed.

## UI and trust boundaries

The two-step popup uses real current tab metadata and original session identity. It never starts inference on page visits or popup reopening. Storage-change events restore actual progress; the UI displays completed/total model batches, not a timer-based percentage. Cancellation remains a trusted explicit popup command. A new scan removes access to the previous report, and navigation/reload/closed source invalidates its binding.

The full report uses the typed engine RiskReport, original document/hash/time, exact source quote, Turkish explanation/severity, original heading and offsets, acceptance state, rejected count, coverage and uncertainty. React never recalculates weights or alarm thresholds. Missing/ineligible/stale scores are not zero. Zero says no verified risk was detected in the examined text, never that the site is legally safe. Rejected proposals are excluded and cannot be represented as confirmed legal problems.

`report.html?id=<UUID>` contains no contract/report. The background checks scan UUID, job UUID, URL, document ID/hash and accepted finding. The content script recomputes the actual source version, resolves a unique visible locator and exact text-node Range, then uses CSS Custom Highlight for eight seconds without wrapping/changing the contract DOM. Missing, ambiguous, changed or closed sources yield Turkish errors.

Settings display installed-model inventory separately from GPU evidence. “GPU durumu bu ekrandan doğrulanamadı.” appears even when Ollama responds. The dated packaged measurement is clearly historical; live residency remains enforced by the unchanged provider. Clearing data removes transient extraction/report/UI identity plus the original local diagnostic record; an active operation must first be cancelled.

Permission manifest remains `activeTab`, `storage`, `scripting` and the two existing loopback hosts. No all-sites/debugger/tabs permission, cloud/API key, MAIN bridge, arbitrary JavaScript tool, proxy, raw-HTML rendering or source-content persistence was added. Report/settings pages receive only their exact bounded read/navigation/status/clear capabilities. Existing popup-only operation and Page Agent action allowlist restrictions remain in place.

## Executed development tests and retained failures

- Initial typecheck exposed unknown React error/state values; typed parsing/conditional rendering corrected them before browser tests.
- First two UI browser attempts failed because an asynchronous wait observed a running checkpoint as if it were terminal. Raw failure evidence is retained under `p3-browser` and `p3-browser-second`. The test now explicitly reads/polls terminal identity/status without weakening expected results.
- Third UI attempt verified real model reopening/source/safe/unknown paths, then failed reading the long scan before terminal extraction. The corrected runner waits for explicit terminal scan states and validates the exact replay document hash. `p3-browser-third` remains intact.
- Fourth focused run passed eleven cases, including real-model close/reopen, exact source highlighting, source hash change, cross-tab isolation, closed tab, safe zero, unknown withholding, settings/clear, unsupported URL and responsive long display. The long display **replays preserved real P2 output**, not fresh P3 inference. Actual screenshots under `p3-browser-fourth/` were visually inspected.
- The first complete P3/P2/P1/P0.1 suite exited zero. Final verification reruns include the additional real injection presentation case and the final newest-snapshot/highlight-reset safeguards. Their canonical results are recorded below.

## ActiveTab and public page compatibility

The native Computer Use runtime initialized and listed available apps; branded Google Chrome was absent. Standard Chrome installation paths were also absent. No Chrome download/install was attempted. Manual branded toolbar control is **BLOCKED** and is separate from automated Chromium action behavior.

The first CDP attempt used a page target and failed: “Action can only be triggered on a tab target.” The corrected test queries actual `tab` targets before calling documented [Extensions.triggerAction](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/). This simulates a user extension action and grants activeTab without changing manifest permissions. The supporting [Puppeteer guide](https://pptr.dev/guides/chrome-extensions) distinguishes popup documents from triggering the extension action.

Before the action, the public tab's URL was unavailable to the extension. After it, Example Domain accepted read-only injection and correctly reported insufficient legal text. Wikimedia's [public privacy policy](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy) produced **405 chunks / 41,002 characters**, PARTIAL coverage, zero Page Agent actions and zero model calls. See [activeTab evidence](evidence/p3-access-wikimedia/access.json). This is compatibility testing, not a labeled AI assessment or final five-site evaluation.

Mozilla's [public privacy notice](https://www.mozilla.org/en-US/privacy/websites/) loaded with its genuine title/headings and 17,598 DOM text characters, but the preserved P1 title recognizer did not identify “Privacy Notice”: INSUFFICIENT, zero documents/model calls. The app displays that outcome honestly. This website compatibility is **DEGRADED**, not success; no all-sites permission or weakened Page Agent action was used to conceal it. Source/text identity and selector limitations on general sites remain; frames are not recursively extracted and dynamic mutations require a new source scan.

## Manual branded Chrome steps and expected observations

1. Run `npm run ollama:start`, `npm run build`, `npm run fixture` from Challenge3. In real Chrome load `.output/chrome-mv3` through Developer mode/Load unpacked.
2. Open `/p2/renewal.html`. Open the toolbar popup; title/URL must match the real active tab.
3. Click Belgeyi Tara. It should show two extracted chunks, with no inference before explicit analysis.
4. Click Risk Analizi Yap. Close/reopen by clicking outside and invoking the toolbar again. The same job must be running/completed, with no second inference request.
5. Open Ayrıntılı Raporu Aç; the report displays the exact original renewal quotation and engine score or an honest withheld state.
6. Kaynağa Git activates the original tab and highlights the exact quotation temporarily. Edit/reload/navigate the source and try again; stale sources must not highlight unrelated text.
7. Cancel a running job and verify that it is not called complete. Try a different website tab: the previous site's report must not be attached to it. Settings must not equate connection with GPU verification.

These manual steps were **not executed in branded Chrome**. Automated evidence does not substitute for that claim.

## Canonical final verification

The fresh [native model series](evidence/p3-model/metrics.json) is **DEGRADED**, exit 1. All **99/99 responses are schema-valid**, with zero invalid responses/retries, nine accepted findings, one rejected unsupported retention proposal, zero accepted out-of-label categories and **one missed expected renewal category in the injection fixture**. Quote matching and the typed engine did not make semantic detection reliable. The injection result is PARTIAL/null with an unresolved issue, not safe zero. Original P2 evidence is retained and these figures are not pooled with its earlier zero-miss series.

| Native scenario | Report | Score | Findings | Wall seconds / calls |
| --- | --- | ---: | ---: | --- |
| Renewal | COMPLETE | 14 | 1 | 7.119 / 1 |
| Sharing | COMPLETE | 31 | 2 | 12.274 / 1 |
| Denial | COMPLETE | 0 | 0 | 0.620 / 1 |
| Cancellation | COMPLETE | 18 | 2 | 13.175 / 1 |
| Ambiguous | PARTIAL | null | 0 | 3.395 / 1 |
| Injection | PARTIAL | null | 0; expected renewal missed | 3.273 / 1 |
| Safe | COMPLETE | 0 | 0 | 0.662 / 1 |
| Long | COMPLETE | 34 | 2 | 70.680 / 90 |
| PARTIAL source supplement | PARTIAL | null | 1 | 6.775 / 1 |
| UNKNOWN source supplement | PARTIAL | null | 1; one proposal rejected | 14.043 / 1 |

Sharing's 31 score follows its accepted sharing and profiling categories; the previous P2 run proposed only sharing and scored 20. The engine is unchanged and deterministic for identical accepted inputs; the model's findings are not deterministic legal truth. The long contract still covers 183 chunks/52,092 characters; no source text was silently truncated.

Actual GPU measurements during the fresh native series: **177 loaded samples**, **100% GPU at 8192**, peak board VRAM **7171 MiB**, peak compute **100%**. Model size/residency remains 5,602,415,738 bytes with size_vram equal to size. Across all 99 calls including supplements: 102,188 summed prompt tokens, 3815 generated tokens, 31.567 s prompt processing, 96.261 s generation, 130.690 s native total, 1.342 s summed warm loading, **39.632 generation tokens/s**. Maximum actual prompt count 1149; unchanged conservative estimate plus output reserve fits 8192. No CPU fallback was used. See [raw response telemetry](evidence/p3-model/network.json) and [repeated GPU samples](evidence/p3-model/gpu-samples.json). GPU configuration/runtime/model were not upgraded.

The intermediate expanded full browser suite exited **1** because its new injection gold assertion observed the same missed category, not because the popup claimed success. The P2 suite passed seven cases; P1 passed five SLOW tasks and twelve FAST outcomes with zero inference, plus expected safety faults; original P0.1 passed three tasks and its intentionally blocked fault. Their preserved intermediate records are `p3-p2-final`, `p3-p1-final`, `p3-p0.1-final` and `p3-full-browser-final-run.log`. The missing-category assertion is retained. The release runner continues the other UI checks after recording a semantic failure, then still exits nonzero if any assertion failed; it does not weaken the gold label or hide failures.

Real runtime-state tests separately passed: [unloaded model](evidence/p3-runtime-states/unloaded.json) reports installed inventory while `/api/ps.models` is genuinely empty; [offline Ollama](evidence/p3-runtime-states/offline.json) reports connection failure with the project-owned server actually stopped and unreachable. Neither used a transport mock. The server/model were restored using the unchanged loopback/runtime configuration afterward. Logs prior to the controlled stop were preserved in `p3-server-pre-offline.log`.

Final build checks: [typecheck PASS](evidence/p3-typecheck-verified.log), [Vitest 113/113 in eleven files PASS](evidence/p3-unit-tests-verified.log), [WXT build PASS](evidence/p3-build-verified.log). The known upstream disabled experimental-eval warning remains in the bundle logs; the action is not enabled and extension CSP has no unsafe-eval.

A last P0.1 regression found a genuine UI completion race: the diagnostic result could be published before the active-operation flag was released, leaving a stale disabled button. `p3-p0.1-ready` and the failed log are retained. The background now cleans up the session/lock before publishing its terminal diagnostic result, without changing the original agent/provider/normalizer. Start operations also reserve their lock synchronously before tab/storage awaits, preventing two popup instances from starting duplicate jobs.

The [rejected-finding browser replay](evidence/p3-rejection-view/integration.json) passed with a retained real P2 proposal/report and a freshly verified source hash. It shows withheld score, excluded-interpretation explanation and only accepted quotes; it performs zero new inference. The same run verifies simultaneous authorized popup scan commands: one fulfilled, one rejected. It is clearly separate from fresh native model evidence and from unit mocks.

## Acceptance gates

| Gate | Status | Evidence/scope |
| --- | --- | --- |
| A Popup | PASS | Real active-page/session state, Turkish controls, connection inventory, restored job, responsive layout. |
| B Workflow | PASS | Explicit scan and real local analysis through unchanged engine; no automatic LLM start. |
| C Report | PASS | Exact quote, original title/URL/hash/time, engine score, Turkish finding/severity and full detail view. |
| D Uncertainty | PASS | UNKNOWN/PARTIAL/interrupted/rejected output withholds score; actual zero uses bounded wording; retained rejection replay verified. |
| E Evidence navigation | PASS on tested fixtures | Exact Range and visible highlight, fresh document hash; changed/closed/ambiguous sources rejected. General-site CSP/locator behavior is not universally verified. |
| F Session management | PASS on executed cases | Popup close/reopen preserves one job; current-tab isolation, cancellation/navigation/worker recovery and simultaneous start lock. |
| G Security | PASS on tested boundaries | Same manifest permissions, strict UI sender/commands, no arbitrary proxy/HTML/scripts/actions; old sender/action guards remain. |
| H Real browser | DEGRADED | UI checks executed, but the full command remains nonzero on the preserved real-model injection gold failure. Manual branded Chrome is separately BLOCKED. |
| I Regression | DEGRADED | P0.1/P1/P2 structural/safety paths and protected files retained; real semantic expected-category miss persists. |

PASS is limited to executed fixtures/cases, not all websites, all model responses, all browser versions or a legal/security certification. Public-site identification on Mozilla is DEGRADED; Wikimedia activeTab/read-only extraction passed with conservative PARTIAL coverage. Keyboard focus and mobile no-horizontal-overflow were tested; a complete assistive-technology/WCAG audit was not performed.

## Reproduce final checks

```powershell
Set-Location C:\Users\Emre\Desktop\nurettin\Challenge3
$env:DEBUG = ''
npm run ollama:start
npm run typecheck
npm test
npm run build
Remove-Item Env:\CLAUSEGUARD_P1_FAST_ONLY -ErrorAction SilentlyContinue
npm run test:browser
$env:CLAUSEGUARD_RISK_EVIDENCE_DIR = 'docs/evidence/p3-model-reproduction'
npm run test:risk:model
npm run report:p3 -- docs/evidence/p3-model-reproduction
$env:CLAUSEGUARD_PUBLIC_URL = 'https://foundation.wikimedia.org/wiki/Policy:Privacy_policy'
$env:CLAUSEGUARD_P3_ACCESS_DIR = 'docs/evidence/p3-access-reproduction'
npm run test:access:p3
node scripts/test-p3-rejection-view.mjs
.local\ollama\ollama.exe ps
nvidia-smi
```

The browser/native suites intentionally preserve a nonzero exit for missing expected model findings. Do not weaken the injection assertion or interpret its failure as proof of a UI crash. Never run inference suites concurrently or pull another model. To repeat genuine unloaded/offline tests, use a project-owned runtime only: unload the exact model with `ollama stop qwen3.5:9b-q4_K_M`, run `node scripts/test-p3-access.mjs unloaded`, stop the verified project server and run the `offline` mode, then immediately restore `npm run ollama:start`. The executed tests restored the server/configuration and subsequent inference verified full GPU again.

Stop at P3. Next phase is P4 only on a new instruction; the semantic miss should remain an explicit limitation or receive separately scoped reliability work.

## Last built artifact and browser outcomes

The final artifact builds at **928.90 kB** reported total. [Final full browser command](evidence/p3-full-browser-accepted-run.log) exits **1**, solely because the preserved injection gold assertion fails. [P3 results](evidence/p3-browser-accepted/integration.json) record twelve executed scenarios, zero UI page errors, and the missed expected category as an explicit semantic failure. Popup, exact highlighting, stale/closed source handling, safe-zero/unknown presentation, settings, clearing and responsive long display were all exercised. No failed model assertion was removed or weakened.

[P2 browser regression](evidence/p3-p2-accepted/integration.json) PASS: seven real cases including mutation/cancel/navigation/worker interruption. [P1](evidence/p3-p1-accepted/integration.json) PASS: twelve FAST outcomes, five/five SLOW tasks and expected safety faults. [P0.1](evidence/p3-p0.1-accepted/browser-integration.json) PASS: three/three ordinary tasks, zero retries, original real DOM interactions, plus the intentionally blocked stale-element fault. This last run verifies the diagnostic completion-race fix; its earlier failing run is preserved.

[Native inventory/hashes](evidence/p3-native-final.json) confirms loopback listener, exact reused model/runtime and 100% GPU/context 8192. Four protected P0.1 files retain byte-identical SHA-256 hashes to P2. Public-site permission checks, genuinely offline/unloaded states, real native model series and replayed report rendering are separate evidence categories. Screenshots are actual running-app captures; popup/report/settings/mobile/source/unknown views were visually inspected.

Remaining limits: branded Chrome manual test BLOCKED; semantic detection DEGRADED; incomplete general-site coverage; Mozilla's unrecognized notice title; conservative source navigation may reject repeated quotes or CSP-limited highlighting; session reports are transient and no automatic worker resume exists. No claim of universal source resolution, legal reliability or comprehensive accessibility certification is made.
