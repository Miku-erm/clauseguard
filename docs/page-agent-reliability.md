# ClauseGuard P0.1 — Page Agent reliability

Executed 9 October 2026 on the existing native Windows `Challenge3` project.
**Final fixed-fixture result: PASS, 10/10 ordinary tasks**, zero invalid model
responses and zero retries. Native tool calling remains **DEGRADED**. Manual
branded Chrome toolbar verification remains **BLOCKED**. This phase stops at P0.1.

## Preserved configuration and scope

The selected model remains `qwen3.5:9b-q4_K_M`, digest
`56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`.
Ollama remains 0.40.0; Alibaba core/controller/LLM packages remain 1.12.4. No
dependency stack reinstall, new LLM, model quantization change, Ollama upgrade,
driver change or cloud API was performed. The same RTX 4060, Flash Attention,
q8_0 KV cache and server default 8192 were used. The existing task string and
fictional fixture are unchanged. Temperature 0.2, presence penalty 0, max output
1536, maxSteps 6, maxRetries 2 and safety constraints remain unchanged.

Original P0 evidence is copied to [p0-original](evidence/p0-original/). Each P0.1
experiment has its own directory. Actual request messages are exclusively the
fixed fictional fixture and agent instructions/history; headers and credentials
are not logged. No arbitrary personal webpage data is collected.

## Best-supported failure explanation

There are three observed mechanisms, rather than a single proven defect:

1. **The installed runtime ignores tool_choice.** The version-pinned OpenAI
   request struct has no corresponding field, and conversion forwards tools
   without selection constraints. Real render probes for none, required, named
   Ping and an invalid named tool returned HTTP 200 and identical rendered
   prompts (SHA-256 `cf5fda8228f9acdd88dc2edf925f48227b84094698486638213d6225e944eaa3`).
   Required/named requests returned plain PONG with zero tools; a request with
   `tool_choice:none` still called Ping when its user message requested that.
   The simple Ping arguments correctly contain label PONG. Thus simple native
   tool extraction works, but tool selection is not enforced.
2. **Complex macro responses conflict with the available output paths.** The
   actual `AgentOutput` has optional evaluation/memory/next_goal strings and a
   required action union. Alibaba's default system prompt requests a JSON
   reflection/action object, while Ollama's rendered Qwen tool instructions
   request XML function/parameter syntax. Native failing responses put all
   reflection/history labels into one evaluation string and omit the action.
   Other responses contain valid JSON directly or JSON with broken wrapping.
   Identical expanded-fixture replay through `/v1/chat/completions` and native
   `/api/chat` produced the same malformed evaluation-only arguments (130
   generated tokens with seed 42). This rules out an OpenAI-envelope-only
   explanation. It does not prove that the XML parser dropped correctly
   generated arguments; raw generated token streams were not captured.
3. **Schema validity alone did not establish task completion.** Requiring only
   the original mandatory action in a response grammar yielded action-first
   `done` outputs, fabricated opened-policy claims and sometimes invented legal
   text. The actual DOM stayed hidden. Existing DOM/call checks rejected all
   ten such attempts. Requiring the existing reflection fields as well changed
   the raw outputs to reflection-first and restored appropriate action choice.
   This strongly supports a field-order/planning compatibility explanation;
   it is not proof of the model's internal reasoning process.

Official sources inspected: installed npm code and [Ollama 0.40.0 OpenAI
handler](https://github.com/ollama/ollama/blob/v0.40.0/openai/openai.go), its
[Qwen3.5 parser](https://github.com/ollama/ollama/blob/v0.40.0/model/parsers/qwen35.go)
and [XML tool parser](https://github.com/ollama/ollama/blob/v0.40.0/model/parsers/qwen3coder.go).
Version-pinned source copies are retained under [p0.1-source](evidence/p0.1-source/).
Changing runtime might enable selection constraints if a future handler actually
implements them; that would still need these exact probes and semantic DOM tests.
No runtime version change was made or assumed to fix model behavior.

## Official normalizer: designed fallback and safety boundary

Installed `normalizeResponse` explicitly supports JSON in message content,
wrapped/double-encoded arguments and malformed function wrappers. It extracts a
JSON object, validates the chosen action against the actual tool registry,
then the LLM client validates the complete macro through Zod before executing
the real tool. It also synthesizes a wait action when the action is missing.
Wait remains unavailable in this prototype, so that repair fails validation and
does not execute an operation.

P0 used both intended content-JSON fallback and recovery of malformed output.
The final P0.1 series uses the intended path: **all 21 raw responses, including
the safety fault, are complete plain JSON with the existing reflection fields
and action**. The official normalizer wraps that model-produced object for the
actual macro execution. There are no raw native `tool_calls` in that series.
No custom parser invents an action, executes prose, supplies a fixed index or
repairs a missing action. Success still requires a real model-selected DOM click
and verified final outcome.

## Diagnostic probes

`scripts/probe-tool-calling.mjs` executes real local inference but no DOM tool:

- Four selection-constraint/render comparisons plus a successful simple native
  Ping call demonstrate missing/ignored tool choice independently of Alibaba.
- Hidden and expanded requests captured from the real unchanged baseline are
  replayed at seeds 42/43 with the original macro schema and one response-format
  candidate. Both original expanded replays fail; original hidden replays work.
- Native API replays reproduce the expanded malformed macro, separating model/
  tool-format behavior from the OpenAI response wrapper.
- An intentional eight-token cap yields finish_reason length and invalid JSON.
  The installed client checks that reason before normalization; the regression
  test confirms it fails without retrying or executing even valid-looking JSON.
- Context usage is recorded: ordinary fixture requests are approximately
  3257–3534 prompt tokens, well within 8192. Baseline malformed responses finish
  with stop/tool_calls rather than length; context exhaustion does not explain
  those failures. Essential DOM data is not truncated.

`scripts/probe-response-grammar.mjs` changes only the grammar's required field
list. Both hidden replays select real click index 0; both expanded replays select
done and quote the actual Section 3 clause. These are **decision probes**, not
functional DOM passes; the real browser series supplies that evidence.

Captured evidence: [initial probes](evidence/p0.1-probes/summary.json),
[reflection probes](evidence/p0.1-reflection-probes/summary.json), actual request/
response files beside them and [derived report](evidence/p0.1-reliability-summary.json).
No streaming experiment was introduced: the installed SDK uses response.json,
the bridge preserves actual JSON/status, and streaming remains explicitly rejected.

## Changes attempted one variable at a time

| Experiment | Changed behavior | Ordinary result | Decision |
| --- | --- | --- | --- |
| Historical P0 | Existing request config | 4/5 = 80% | Preserved history |
| Contemporaneous P0.1 baseline | Measurement instrumentation only | 5/10 = 50% | Confirms unstable original behavior |
| Candidate A | response_format with the exact original macro schema | 0/10 | Rejected: premature done, DOM stayed hidden |
| Candidate B, final | Only that grammar's required fields strengthened to existing evaluation_previous_goal, memory, next_goal, action | 10/10 | Accepted for this fixture |

The final change is in `localPageAgentRequest` using Alibaba's supported
transformRequestBody hook and Ollama's supported json_schema output format.
`buildResponseGrammar` reuses every original property/action definition and
requires the existing reflection fields. The **tool definition itself stays
unchanged**; no alternate agent, tool schema action or executable operation is
added. Runtime macro validation remains authoritative.

The Service Worker now requires the fixed response-format fields and exact
derived grammar; an incomplete or different grammar is rejected. The browser
harness gains request/response correlation, separate experiment folders and
repeated nvidia-smi / CLI / API samples during tasks. Reports expose raw native
versus content responses, validated executed actions, retry reasons, failures,
context counts and thinking-to-execution intervals.

Reported task durations run from fixture-agent initialization to its result;
they include the core loop/DOM tools and exclude Service Worker model preparation
and browser/fixture loading. Prompt and native generation timing are reported
separately rather than treating the whole task interval as tokens-per-second.

## Ten-attempt final result

| Attempt | Real click | Correct Section 3 / quotation | Valid done | Invalid responses | Retries | Seconds | Residency |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | PASS | PASS | PASS | 0 | 0 | 10.000 | 100% GPU / 8192 |
| 2 | PASS | PASS | PASS | 0 | 0 | 10.076 | 100% GPU / 8192 |
| 3 | PASS | PASS | PASS | 0 | 0 | 9.912 | 100% GPU / 8192 |
| 4 | PASS | PASS | PASS | 0 | 0 | 9.831 | 100% GPU / 8192 |
| 5 | PASS | PASS | PASS | 0 | 0 | 9.810 | 100% GPU / 8192 |
| 6 | PASS | PASS | PASS | 0 | 0 | 9.506 | 100% GPU / 8192 |
| 7 | PASS | PASS | PASS | 0 | 0 | 9.862 | 100% GPU / 8192 |
| 8 | PASS | PASS | PASS | 0 | 0 | 9.219 | 100% GPU / 8192 |
| 9 | PASS | PASS | PASS | 0 | 0 | 10.180 | 100% GPU / 8192 |
| 10 | PASS | PASS | PASS | 0 | 0 | 9.368 | 100% GPU / 8192 |

Independent attempts reload the same fixture and create a fresh agent/session;
none inherits an open policy. All use the unchanged task, model and sampler.
The test harness clicks only the extension's Test Page Agent button. ClauseGuard's
real upstream controller executes the model-selected policy action.

Final completion **100% (10/10)**; mean **9.776 s**, median **9.847 s** over all ten.
The contemporaneous baseline mean was 14.031 s and median 15.619 s, with 12 retries
and 16 invalid responses. Historical P0 had 5 retries and 6 invalid responses in
five attempts. Candidate A's faster 3.493 s mean reflects failed premature stops,
not a performance success. All three experiment batches and failures are retained.

The eleventh final attempt is a separate stale-button safety fault: one actual
guarded click fails, the agent stops in **3.806 s**, the policy remains hidden,
and no unrelated control is clicked. It is an expected task FAIL / safety PASS
and excluded from the ordinary success rate.

## GPU and security impact

Every final ordinary attempt has 13–16 real samples and 97–100% peak compute
utilization, with CLI 100% GPU and API context 8192/size_vram equal to model size
throughout. Peak board memory was 7051–7057 MiB, including other desktop processes.
Model residency remains 5,602,415,738 bytes wholly GPU resident. Thinking-to-tool
execution intervals are retained per attempt; those include prompt/transport time
and must not be called native generation throughput.

The separate final 8192 native generation check measured **40.330 tok/s**,
3866 prompt tokens, 512 generated tokens, 1857.387 prompt tok/s, 3.263 s load,
18.069 s native total / 18.196 s wall, 7042 MiB peak board VRAM and 100% peak GPU
utilization. Both markers survived, no input truncation/OOM was observed, and the
512 output cap was deliberate. See [final 8192 GPU evidence](evidence/p0.1-gpu-8192/gpu-benchmarks.json).
The small difference from P0's 40.244 tok/s is not a statistically demonstrated
speed improvement; no inference performance regression was observed.

An npm PowerShell wrapper dropped the intended context flag in an earlier final
diagnostic invocation. The retained log shows that the default multi-context run
finished before the termination request took effect. 8192 was then restored and
confirmed, and the benchmark was repeated with direct Node invocation.
The accidental evidence is retained in `p0.1-gpu/`; only the explicit one-context
`p0.1-gpu-8192/` run supplies the P0.1 benchmark. The ten agent attempts had already
finished independently and all used 8192. No server defaults or persistent model
parameters were changed by those temporary request overrides.

Safety regressions pass: the real registry remains click/scroll/done; scripts,
form input and account operations remain disabled; original-element/index guards
remain; unsafe normalized actions and invalid arguments cannot execute. Actual
isolated-content START_TEST is rejected, page postMessage cannot start a session,
all model requests come from the Service Worker, no unrelated control is clicked,
and Ollama remains bound only to 127.0.0.1. No arbitrary proxy or credential bridge.
The response grammar is strictly constrained; it does not weaken action safety.

37 tests across seven files pass (the existing 29 plus eight new regression tests),
typecheck passes, and WXT builds. The documented unused upstream eval warning
remains; its tool is disabled/removed and CSP permits no unsafe-eval.

## Remaining limits and manual Chrome verification

The 9/10 target is met for this fixture, not a guarantee for arbitrary sites,
larger DOMs/history or other tasks. Native structured tool calls remain degraded;
the accepted supported route is plain schema-constrained macro JSON plus official
normalization. Failures remain explicit, retries bounded and task success depends
on actual DOM evidence. General risk analysis and P1 are not implemented.

Manual Chrome: **BLOCKED**. Computer Use returned missing native pipe / Windows
error 2, CUA inventory returned no apps/browsers, and branded Chrome was not found
at its conventional executable/registry locations. Cached Chromium 153 automated
tests must not be called manual toolbar verification. See [UI evidence](evidence/p0.1-manual-ui.json).

For manual verification on an available Chrome desktop:

1. `npm run build`; load `.output\chrome-mv3` from `chrome://extensions`.
2. Permit that actual extension ID with
   `powershell -NoProfile -File scripts/start-ollama.ps1 -ExtensionId YOUR_ACTUAL_EXTENSION_ID -Restart`.
3. `npm run fixture`; open `http://127.0.0.1:4173/fixture.html` in the active tab.
4. Open the real toolbar popup and click Test Page Agent. Do not click the policy
   button yourself. Observe the agent reveal it and return Section 3 with a quote.
5. Reload and repeat ten times. Record failures; inspect `.local\ollama\ollama.exe ps`
   and `nvidia-smi` repeatedly during execution.

Automated reproduction commands are in README. No GitHub publication; stop at P0.1.
