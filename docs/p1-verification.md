# Phase P1 verification — 9 October 2026

Implemented in `C:\Users\Emre\Desktop\nurettin\Challenge3`: document extraction, original-source metadata and version hashes, deterministic reflex routing, read-only FAST and approved-fixture real Alibaba SLOW. No risk analysis/scoring, Jev installation, llms.txt, MCP, cloud inference, model/runtime/dependency reinstall, model download or GitHub publication. This is not the completed assignment.

## Acceptance gates

| Gate | Status | Executed evidence and scope |
| --- | --- | --- |
| A — extraction | PASS | Real browser fixtures A–H plus ambiguity/partial/unregistered aliases; 180-clause agreement fully captured (181 chunks / 44,548 characters). [Full suite](evidence/p1-verified/integration.json), [unit log](evidence/p1-vitest.log) |
| B — traceability | PASS | 276 real-DOM text-node reconstruction checks, zero mismatches; independent SHA-256 checks, stable repeated document IDs; unit tests preserve duplicate paragraphs, inline whitespace and version changes. [Summary](evidence/p1-summary.json) |
| C — FAST | PASS | 12/12 expected extraction/coverage/insufficient outcomes, zero inference POSTs, provider calls and agent invocations. Mean engine 5.208 ms; final artifact repeated these checks after the small terminology update. [Network](evidence/p1-verified/network.json), [final artifact](evidence/p1-final-artifact/integration.json) |
| D — SLOW | PASS for controlled fixtures | Actual Alibaba 1.12.4, three hidden-policy and two three-section tasks: 5/5 DOM interactions and complete extraction, fourteen actual tools (9 clicks/5 done), zero failed ordinary tools/retries. [Raw activities/results](evidence/p1-verified/integration.json), [actual responses](evidence/p1-verified/responses.json) |
| E — coverage | PASS | Controlled completeness requires all expected original blocks; hidden/changed/missing legal blocks are PARTIAL, unknown inventory UNKNOWN, landing page INSUFFICIENT with no document, ambiguity remains separate. Dynamic missing block tested before insertion in Vitest and after actual timer insertion in Chromium. |
| F — safety | PASS within tested boundaries | Removed control blocked (one actual failed tool, hidden DOM unchanged); cancellation leaves policy hidden; navigation closes stale command and fails. Real unauthorized sender denied, page postMessage ignored, main-world bridge/agent/runtime API absent, unrelated controls untouched, SW-only fixed model requests, no unrelated/injection content in navigation prompts. [Security](evidence/p1-verified/security.json) |
| G — regression | DEGRADED overall; automated PASS | Typecheck PASS, 57 tests/9 files PASS, WXT build PASS; original P0.1 task 3/3 plus safely blocked removed-button fault; final built artifact popup/load/FAST PASS. Manual branded Chrome toolbar and arbitrary-origin activeTab grant remain BLOCKED/unverified, not represented as automatic-browser passes. [Original regression](evidence/p1-p0.1-verified/browser-integration.json), [final smoke](evidence/p1-p0.1-verified/browser-final-smoke.json) |

## Measured results

FAST cases include deliberately insufficient and ambiguous documents; “12/12” means correct expected behavior, not twelve complete documents. Range 1.4–26.9 ms engine time, zero LLM requests. Full long agreement extraction took 26.9 ms in the measured suite. Original source checks include every chunk from ordinary cases; long fixture includes final Section 180 and its mandatory-rights qualifications.

SLOW hidden-policy engine durations: 8.931, 7.551, 9.594 seconds. Three-section durations: 16.361, 21.817 seconds. Mean across five is 12.851 seconds, including re-extraction/GPU check; separate browser wall and agent durations are retained per case. Requests are actual model inference, not mocks; no fixture policy button is clicked by the application or Playwright as an agent substitute. Ordinary failed tools/retries: zero. Expected safety faults are excluded from success rate and retained as FAILED.

GPU: same RTX 4060 Laptop, driver 596.49, Ollama 0.40.0 and authorized Q4_K_M model. All 87 loaded ordinary SLOW samples show CLI 100% GPU and API context 8192 with size == size_vram == 5,602,415,738 bytes. Peak board memory 7060 MiB / peak compute 100%; no observed operational CPU offloading. Model residency is independently measured, not inferred from generated text. Sum of actual step usage: 47,315 prompt / 1,969 completion tokens; maximum combined step 3962, below context capacity. P1 did not run a new inference TPS/native load/context benchmark; historical 40.330 tokens/s / 3.263 s load is clearly labeled P0.1. [Samples](evidence/p1-verified/gpu-samples.json), [performance](performance.md).

The P0.1 grammar (`macro-schema.ts`, `page-agent-config.ts`), official upstream normalizer, provider GPU preload and original `fixture-agent.ts` were not altered. Every recorded ordinary P1 request uses exact local model, nonstreaming, existing response-format grammar and Service Worker transport. Native tool_calls remain unreliable; the verified schema-constrained JSON/official-normalizer route is retained.

## Failed attempts retained

Initial unit failures found Turkish characters corrupted during Windows pipe-based fixture generation; fixed with explicit Unicode encoding. First browser run (`evidence/p1/`) passed five ordinary SLOW tasks but removed-target reporting was INSUFFICIENT; it now produces FAILED while preserving blocked-tool events. Second run (`p1-final/`) demonstrated corrected behavior but its harness mistakenly applied a default COMPLETE expectation to safety faults; the test was fixed to omit that expectation. These directories remain failed historical evidence. Verified full suite is `p1-verified/`, not pooled with those runs.

Final small change recognizes “Abonelik Şartları” and reports unfollowed legal links on landing pages. Final typecheck/unit/build and separate twelve-case FAST/security artifact run pass. Model/tool/transport code remained unchanged by that final terminology change; original GPU/agent regression evidence comes from the full suite immediately before it. [Final artifact log](evidence/p1-final-artifact.log), [build log](evidence/p1-build.log), [typecheck](evidence/p1-typecheck.log).

## Files and dependencies

Created reusable code: `src/extraction/{schema,text,identify,locator,fixture-expectations,dom}.ts`, `src/reflex/engine.ts`, `src/agent/discovery-agent.ts`, `src/extension/scan-protocol.ts`, `entrypoints/scan.content.ts`.

Modified integration/UI: `entrypoints/background.ts`, `entrypoints/content.ts` (ignore unrelated scan messages), `src/extension/protocol.ts` (strict scan commands and exact authorized fixture sessions), `src/ui/{App.tsx,style.css}`, `wxt.config.ts` (scripting permission, P1 labeling), `package.json` (test/report scripts). No new dependency; existing lockfile unchanged.

Created tests/artifacts: `fixtures/p1/{visible,hidden,multiple,long,landing,noisy,dynamic,injection,ambiguous,partial}.html`, `fixtures/p1/fixture.js`, `tests/unit/{extraction,reflex}.test.ts`, `scripts/{test-p1-browser,run-browser-suite,report-p1}.mjs`. Modified `scripts/serve-fixture.mjs` to serve exact loopback routes. Created docs `document-extraction.md`, `reflex-engine.md`, `p1-verification.md`; updated README, architecture, performance and progress. Raw phase-specific JSON, logs and PNG evidence are under `docs/evidence/`.

Dependencies remain WXT 0.21.4, strict TypeScript 5.9.3, React 19.2.0, Zod 4.5.1, Alibaba core/controller/llms 1.12.4, Vitest 5.0.3, jsdom 26.1.0 and playwright-core 1.64.0. No new browser, model or package download in P1.

## Reproduction

```powershell
Set-Location C:\Users\Emre\Desktop\nurettin\Challenge3
$env:DEBUG = ''
npm run ollama:start
.local\ollama\ollama.exe --version
.local\ollama\ollama.exe list
nvidia-smi
Get-NetTCPConnection -LocalPort 11434 -State Listen
npm run typecheck
npm test
npm run build
Remove-Item Env:\CLAUSEGUARD_P1_FAST_ONLY -ErrorAction SilentlyContinue
npm run test:browser
npm run report:p1
.local\ollama\ollama.exe ps
Invoke-RestMethod http://127.0.0.1:11434/api/ps
```

The server already exists on this workspace; `ollama:start` reuses it without changing config. If not running, the script restores the existing loopback/8192/Flash Attention/q8 KV settings and exact extension CORS origin. Do not download another model. Browser suite starts/closes its own fixture server when necessary. An externally running older fixture server must be restarted manually using `npm run fixture` to expose new routes.

For manual Chrome: `npm run fixture`, load `.output/chrome-mv3` unpacked, open `/p1/visible.html` then toolbar **Belgeyi Tara**; repeat `/p1/hidden.html` and `/p1/multiple.html`, inspect output and actual DOM. On arbitrary real pages invoke the toolbar so Chrome grants activeTab; expect UNKNOWN/PARTIAL rather than COMPLETE. Native Computer Use pipe / branded Chrome toolbar was unavailable in the prior inspection, so those actions are precise manual checks, not claimed results.

Optional final-build FAST-only reproduction (does not test SLOW):

```powershell
$env:CLAUSEGUARD_P1_FAST_ONLY = '1'
$env:CLAUSEGUARD_P1_EVIDENCE_DIR = 'docs/evidence/p1-final-artifact'
node scripts/test-p1-browser.mjs
Remove-Item Env:\CLAUSEGUARD_P1_FAST_ONLY
$env:CLAUSEGUARD_EVIDENCE_DIR = 'docs/evidence/p1-p0.1-verified'
node scripts/smoke-browser.mjs
```

## Remaining limits and next phase

This is controlled-fixture reliability, not a population estimate for arbitrary sites. Automatic clicks are intentionally unavailable on general pages. General identification is heuristic; PDF/frame/shadow/virtualized/cross-page documents and arbitrary delayed updates are incomplete or unsupported. Selectors/node paths must be reverified against source hashes after DOM changes. Web Crypto and Chrome message/session-storage capacity can impose runtime limits, reported as failures rather than truncation. Source normalization uses DOM text nodes rather than rendered typography. The known upstream unused eval bundler warning remains: script execution is disabled/removed and extension CSP has no unsafe-eval. See [extraction limitations](document-extraction.md).

Recommended next work is user-authorized P2 clause evaluation using these versioned source chunks and exact quotation verification, after manual toolbar validation. It has not been started. Stopped after P1.
