# Final security summary

The extension retains restricted actual Alibaba tools (`done`, permitted policy clicks and bounded scrolling), disabled experimental script execution, ISOLATED content scripts, strict AgentOutput grammar/official normalizer, validated Service Worker messaging and loopback-only Ollama requests. Model/runtime/quantization/GPU settings were not changed for delivery. There is no cloud model, arbitrary localhost proxy, form/purchase/login tool or automatic unrelated-tab browsing.

## Recorded tests, kept separate

- Original P4: twelve controlled attack scenarios completed, with genuine renewal detection and actual policy opening recorded. Historical evidence is retained in `docs/evidence/p4/`.
- Later P4.1 repetition: nine completed cases are recorded; nine retained the genuine risk and passed runtime controls, eight finished the agent task successfully. Case F opened the policy through the real tool but ended FAIL after blocked scroll repetitions. Three cases have no final record; they are not passes. This interrupted run does not replace the original twelve-case result.
- Final delivery: 155 deterministic tests include existing attack policies, malformed output, strict evidence, sender validation, llms.txt malicious/outside-scope data and new demo-frame restrictions. Final smoke and Cypress use actual model/agent behavior; their machine records are under `docs/evidence/final/`.
- The negative demonstration forbids an unsupported automatic-renewal finding; incomplete input withholds a complete-contract score. The original injection fixture remains unchanged and available for reproduction.

Runtime prevention and semantic detection are separate. A blocked dangerous instruction does not prove correct contract interpretation. Semantic false positives/negatives and unsolicited uncertainty remain documented in the provisional evaluation and P4.1 reports. No universal immunity is claimed.

## Added integrations

`llms.txt` is untrusted metadata. Prose/instructions are discarded; bounded Markdown links stay within the authorized origin. Credentials, unsafe schemes and redirects are rejected. A link is not evidence until its actual document is independently extracted and verified. The real five-scenario HTTP integration and popup candidate-navigation proof are retained.

MCP is local stdio only. All tools have strict argument/result schemas and no arbitrary file/network/browser capabilities. Explicit source text is inserted with `textContent`; its scripts cannot run. A real client demonstrated invalid-argument and fabricated-quote rejection plus actual local analysis.

The Cypress adapter is available only through the packaged demo page on localhost and selects one of two fixed fixture URLs. It validates the actual source frame/document identity; duplicate or unrelated frames are rejected. It does not relax ordinary sender/session or DOM-action checks. UI-button activation is distinct from the policy button clicked by Alibaba.

## Dependencies and host-system boundary

`npm audit` recorded six development-tool advisories (three moderate, three high) involving Cypress and its transitive request/extraction/system-information/UUID/query dependencies. See `docs/evidence/final-dependency-audit.json`. No blind major-version upgrade was applied; installed Cypress 15.7.0 uses the existing verified binary and isolated controlled fixtures. This is a residual dependency limitation, not a claim that the repository is vulnerability-free.

Package additions used `--ignore-scripts`; Cypress's existing binary and FFmpeg were reused. The necessary FFprobe package was added. No new AI model, CUDA/runtime installation, registry/startup/task change or security-setting modification was performed. Clearing `ELECTRON_RUN_AS_NODE` applies only to the Cypress child process environment, not Windows settings.

The user reported the earlier Defender incident resolved and authorized resumption. Application tests neither attribute that incident nor certify the computer clean. No production security certification or human legal review is claimed.
