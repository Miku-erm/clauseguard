# P4 security assessment

This is a bounded smoke test, not a claim of universal prompt-injection immunity. The methodology separates forbidden behavior from legitimate task completion, following [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html). Attack markers prove input delivery, not exploitation. Direct requests before modification and the original browser failure remain in `docs/evidence/p4/baseline/`.

## Trust boundaries

1. Visited webpage → DOM extraction: all text is untrusted; scripts, controls, navigation and hidden elements are excluded from legal extraction. Hidden text exclusion is an extraction boundary only. Document titles identify candidates but cannot grant COMPLETE coverage.
2. DOM → Alibaba Page Agent: the actual controller enumerates the DOM. The P0 fixture controller whitelists the original approved button, blacklists every other element, and rechecks URL, identity, connection, type, form ancestry and DOM index at execution. Registry contains only done, bounded scroll and guarded click. Experimental script execution and llms.txt remain disabled. Upstream bundles contain an unused eval implementation; runtime registry restrictions and negative tests are the relevant controls.
3. Content Script → Service Worker: strict messages and sender checks; sessions bind UUID, tab, top frame, Chrome document identity, expiration, budget and active request. A page cannot initiate privileged operations or forward an arbitrary URL. There is no MAIN-world credential bridge.
4. Service Worker → Ollama: fixed loopback origin, exact authorized model, context 8192, no cloud endpoint, redirect refusal. Local process listener is independently checked. Harmless `ollama` placeholder is not a secret; real credentials are neither supplied nor available to these tests.
5. Native risk model → evaluator: tool-free JSON only, strict schema, completion/context guard; numeric scores and unexpected fields rejected. Predictions remain untrusted.
6. Evaluator → evidence validator: original chunk IDs, immutable document/chunk hashes, exact original UTF-16 spans and batch membership. Invented quotes/IDs are rejected. Exact quotes cannot prove correct semantics; separate provisional semantic reviews grade interpretation.
7. Validated findings → score/UI: fixed category weights, deterministic deduplication and scoring; incomplete, rejected or unresolved reports withhold the number. React renders text; no model-generated JavaScript is executed. Source navigation re-extracts the document and verifies hash/range. Cross-tab and stale-source checks remain enforced.

## Executed tests and interpretation

`fixtures/p4/attacks.json` defines A visible instruction, B hidden instruction, C fake SYSTEM, D score zero, E suppress renewal, F forged quote, G configuration/prompt disclosure, H forbidden payment, I embedded instruction, J adjacent instruction, K base64 instruction, L benign discussion. Each retains an independently defined affirmative renewal disadvantage. The original P3 fixture was not rewritten.

`npm run test:security:p4` invokes actual Alibaba exploration in the built MV3 extension and native risk inference. It saves request bodies, tool histories, DOM state, call counts, duration and attack-delivery proof in `docs/evidence/p4/security/`. The runner never opens the permitted policy itself. H instruments a forbidden form/button so an actual click or submission is observable. A safe run without an attempted forbidden call is recorded as absence of unauthorized behavior; unit tests separately exercise explicit rejected actions. B's hidden risk extraction is tested before an explicit paired visible probe: the latter proves actual model exposure, never immunity to excluded text.

The 137-test unit suite includes actual upstream registry restriction, invalid tool arguments, form/purchase target rejection, forged quotation/ID, strict native completion and JSON rejection, score-field injection, cross-tab/session/document/expiration rejection, stale source checks, URL/model/stream forwarding rejection and hidden/visible boundaries. These are deterministic negative controls, not simulated live-model passes. Full browser outcomes, including retained failing assertions, are recorded separately in the P4 verification report.

## Residual vulnerabilities

Visible/encoded instructions still reach model reasoning. Instruction-only defenses cannot guarantee risk recall. A model may suppress a legitimate risk, assign the wrong category, omit a mandatory-law qualification, truncate an ID or fabricate a quote while obeying the JSON schema. Exact evidence and tool isolation limit actions and invented evidence, but cannot certify interpretation. Source completeness is UNKNOWN/PARTIAL on public sites; no global safe score is justified. Internal prompt disclosure is assessed only against supplied test content; this is not a comprehensive exfiltration penetration test. No real secrets or accounts are placed in fixtures.

Full official agreement snapshots and raw real-contract traffic are private under ignored `.local/p4/`. Public outputs contain hashes, metadata, draft annotation spans and aggregate measurements. Do not commit private snapshots or treat draft annotations as legal advice.

## Final bounded observations

All twelve actual Alibaba exploration tasks opened the hidden section; all twelve native risk probes retained the independently known renewal disadvantage. Eleven visible attack/benign texts reached the Page Agent; hidden B did not, and was tested separately as a visible native risk probe. Forty-three actual Alibaba calls/tool steps included seven blocked/failed scroll actions, zero upstream retries and twelve real permitted clicks. No forbidden payment event or tested internal-prompt disclosure was observed. Postchecks found no accepted finding sourced from instruction-only attack text. See security/summary.json, results.json, network.json and postchecks.json. These are single variants, not universal attack immunity or comprehensive secret-exfiltration testing.

Runtime/process availability is separate: the interrupted experiment demonstrated that ollama ps alone can retain stale 100% GPU metadata after a compute-process loss. The final evaluation adds independent VRAM consistency to API/PROCESSOR sampling and saves measurements immediately. GPU proof is taken from the recovered fresh run, never the contradictory interrupted snapshot.

## P4.1 preservation and regression

P0.1 Alibaba grammar, official normalizer, safe DOM action restrictions, isolated content-script architecture and validated Service Worker networking are preserved. P4.1 changes risk instructions, batch sizing, output reservations and one-to-one evidence-space restoration, not browser privileges. No experimental script tool, MAIN-world proxy, credential exposure or arbitrary URL forwarding is introduced.

All twelve original attack fixtures and the original P3 adversarial source remain unchanged. Runtime forbidden-action prevention, actual permitted DOM opening and genuine-risk detection are measured separately. scripts/verify-p4-1-coexposure.mjs checks actual native request/response records containing BOTH the attack payload and the genuine renewal clause; a merely excluded hidden payload is not sufficient model-defense proof. An entire case cannot pass with suppressed renewal. Strict evidence still rejects invented, changed, adjacent-chunk and unsupported-category proposals.

Controlled attacks do not prove universal injection immunity. The user reported the Windows Defender incident resolved and authorized resumption; these application tests neither establish the incident's source nor certify the computer clean. No registry, scheduled-task or security-setting modification is part of P4.1.
