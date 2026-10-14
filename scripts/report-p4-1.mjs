import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const optional=p=>fs.existsSync(p)?read(p):null;
const base='docs/evidence/p4.1/';
const baseline=read(base+'baseline/evaluation__metrics__latest.json');
const candidate=optional('evaluation/p4.1/candidate-metrics.json');
const pilot=optional('evaluation/p4.1/candidate/latest.json');
const final=optional('evaluation/p4.1/final-metrics.json');
const finalRun=optional('evaluation/p4.1/final/latest.json');
const decision=read('evaluation/p4.1/final-stage-decision.json');
const config=read(base+'final-config.json');
if(pilot&&pilot.config.promptHash!==config.promptHash)throw Error('Pilot does not evaluate the final candidate');
const build=optional(base+'final-build-exits.json');
const browser=optional(base+'final-browser-suite/suite-exits.json');
const security=optional(base+'final-security/summary.json');
const co=optional(base+'final-security/coexposure.json');
const semantic=optional(base+'final-independent-semantics/summary.json');
const targeted=optional(base+'final-independent-targeted/summary.json');
const safe=optional(base+'final-independent-safe/summary.json');
const packet=read('evaluation/p4.1/review-packet.json');
const integrity=read(base+'final-integrity.json');
const run=finalRun??pilot;
const native=run?read(run.privateNetwork):[];
const invalidJson=native.filter(n=>{try{JSON.parse(n.response.message.content);return false}catch{return true}}).length;
const generated=native.reduce((n,r)=>n+(r.response.eval_count??0),0);
const prompt=native.reduce((n,r)=>n+(r.response.prompt_eval_count??0),0);
const generationMs=native.reduce((n,r)=>n+(r.response.eval_duration??0)/1e6,0);
const loadMs=native.reduce((n,r)=>n+(r.response.load_duration??0)/1e6,0);
const durationMs=run?.documents.reduce((n,d)=>n+d.durationMs,0)??null;
const performance=run?{scope:run.config.scope,freshCalls:run.freshCalls,replayedCalls:run.replayedCalls,durationMs,promptTokens:prompt,generatedTokens:generated,tokensPerSecond:generationMs?generated*1000/generationMs:null,warmLoadMs:loadMs,invalidJson,gpu:run.gpu}:null;
const reviewSha=createHash('sha256').update(fs.readFileSync('evaluation/annotations/gold.json')).digest('hex');
const gates={A:'PASS',B:targeted?.status==='PASS'&&semantic?.status==='PASS'&&safe?.status==='PASS'?'DEGRADED':'FAIL',C:finalRun?(final?.invalidStructuredResponseCount?'DEGRADED':'PASS'):'DEGRADED',D:build?.test===0?'PASS':'BLOCKED',E:security&&co?(security.status==='PASS'&&co.status==='PASS'?'PASS':'FAIL'):'BLOCKED',F:finalRun&&final?'PASS':'BLOCKED',G:run?(run.gpu.fullGpu?'PASS':'FAIL'):'BLOCKED',H:browser&&build?(browser.length===4&&browser.every(r=>r.exitCode===0)&&Object.values(build).every(e=>e===0)?'PASS':'FAIL'):'BLOCKED',I:'PASS'};
const complete=Boolean(build&&browser&&security&&co&&candidate);
const core={phase:'P4.1',at:new Date().toISOString(),status:complete?'VERIFICATION_COMPLETED_CANDIDATE_NOT_ACCEPTED':'IN_PROGRESS',provisional:true,humanVerifiedCount:0,referenceSha256:reviewSha,baseline:baseline.micro,candidate:candidate?.micro??null,final:final?.micro??null,stageD:decision,config,performance,build,browser,semantic,targeted,safe,security,coexposure:co,integrity,gates};
const pct=v=>v==null?'N/A':(100*v).toFixed(2)+'%';
const rows=[['BASELINE_P4',baseline,'Full extracted-text run'],['CANDIDATE_P4_1',candidate,'Fresh selected-reference-batch pilot'],['FINAL_P4_1',final,final?'Full extracted-text run':'BLOCKED: smaller semantic gate failed']];
const lines=[
'# Phase P4.1 verification',
`Generated ${core.at}. **${core.status}**. The candidate is not accepted as semantically reliable. Stop at P4.1; no later phase, new model, cloud backend, runtime/dependency download or publication.`,
'## Original regression',
'The unchanged original source states monthly automatic renewal without reminders and cancellation at least thirty days beforehand. Both AUTOMATIC_RENEWAL and DIFFICULT_CANCELLATION_OR_REFUND are supported. Medium/medium gives round(20 × .7 + 18 × .7) = 27. The old score-14 assertion and original failure are archived. The corrected browser assertion requires both source-backed categories and the unchanged formula for actual model severities; it does not force severity or blindly hardcode 27. Source adjudication v1 is evaluation/p4.1/renewal-adjudication.json, pending human review.',
'An additional development text explicitly states indefinite post-closure storage without any deletion right. Both storage and rights restrictions are supported; the original single-category assertion is archived. The revised two-category assertion remains failing when the model misses deletion rights. See retention-adjudication.json; this correction is not used to conceal the failure.',
'## Semantic quality and comparison',
`Reference dataset: original eight-label gold, SHA-256 ${reviewSha}; **PROVISIONAL**, zero human approvals. Supplemental annotations do not enter comparison.`,
'| Version | TP | FP | FN | Precision | Recall | F1 | Scope |\n|---|---:|---:|---:|---:|---:|---:|---|',
...rows.map(([name,m,scope])=>`| ${name} | ${m?.micro.tp??'N/A'} | ${m?.micro.fp??'N/A'} | ${m?.micro.fn??'N/A'} | ${pct(m?.micro.precision)} | ${pct(m?.micro.recall)} | ${pct(m?.micro.f1)} | ${scope} |`),
'Baseline versus pilot is not a full-run before/after comparison. Changed prompts were measured with fresh inference; the earlier V6 pilot 75% F1 is preserved separately and does not validate this candidate. The final full run was deliberately not started: Stage D requires passing the smaller checks. No final full-run TP/FP/FN, coverage or speed is invented.',
`Existing semantic suite: ${semantic?.status??'BLOCKED'}, ${semantic?.calls??'N/A'} native calls across eleven repeated cases. Short-page suite: ${safe?.status??'BLOCKED'}, ${safe?.calls??'N/A'} calls across four cases. Wider target suite: ${targeted?.status??'BLOCKED'}, failures ${targeted?.failed.join(', ')??'N/A'}, ${targeted?.calls??'N/A'} native calls plus five deterministic context plans.`,
'Known residuals: bounded deletion is incorrectly summarized in unresolvedIssues; missing-topic text incorrectly becomes uncertainty; express deletion-right denial is missed. The narrow eleven-case suite alone is insufficient proof. The pilot also contains an invented Spotify claim deadline (payment lookback confused with filing period), omitted Reddit statutory protections, Dropbox cancellation/refund conflation, duplicate Discord findings, severity disagreement and some English output despite Turkish instructions. Exact quotation does not establish semantic truth.',
'No second semantic pass retained: no measured evidence justified adding one, and reviewing only proposed uncertain findings would not automatically fix unsolicited uncertainty or omitted findings. No keyword-only classifier or fixture-name answer rule is used.',
'## JSON reliability and coverage',
'P4 had eight invalid JSON responses, all done_reason=length at 1536, across two attempts for each of four failed batches. Native prompts 1025–1519 were far below 8192; no context exhaustion, OOM or GPU fallback was established as the cause. GitHub nine, Discord one, Spotify six and Dropbox seven primary chunks account for 23 missing analysis chunks. Extraction UNKNOWN/PARTIAL is separate.',
`Final candidate pilot: ${pilot?.freshCalls??'N/A'} fresh calls, invalid JSON ${candidate?.invalidJsonCount??'N/A'}, invalid structured responses ${candidate?.invalidStructuredResponseCount??'N/A'}, response failures ${candidate?.modelResponseFailures??'N/A'}. This is not a full-corpus boundary-success claim. Older-prompt replays of failed batches are development evidence, not proof for the final changed prompt.`,
'At most two new chunks per batch with bounded previous context. Entire conservative byte-based input estimate includes schema and instructions; input planning reserves 1536 tokens. Requests use 3072, otherwise 2048, otherwise 1536 only when the complete budget fits 8192. Large-input fallback can still exhaust output. Native finish/schema/context errors are rejected, never repaired. Production allows at most two attempts and ninety seconds per request/fifteen minutes per document; evaluation-only deadline is one hour.',
'| Source | Planned full batches | Unbatchable chunks | Final full analysis |\n|---|---:|---:|---|',
...config.plans.map(p=>`| ${p.source} | ${p.batches} | ${p.unbatchable.length} | ${finalRun?'see final run metadata':'NOT RUN'} |`),
'All five original HTML/extraction snapshots and original gold hashes remain identical. Completing extracted chunks would not establish full website completeness. No whole-contract score is authorized for insufficient extraction or analysis coverage.',
'## Evidence and annotations',
'Only U+00A0 and U+202F to ASCII-space one-to-one equivalence is allowed for substring location. Original source slice, quote, UTF-16 offsets and hashes are restored. Occurrence metadata contains literal repeats only. No punctuation/case folding, ellipsis expansion, adjacent-chunk joining, whitespace collapse or fuzzy fabrication repair. The 129 baseline rejected records include four space-equivalent candidates; other errors are not automatically rescued. Eight added evidence tests exercise restoration and strict rejections.',
`Pilot raw accepted proposals ${candidate?.rawAcceptedProposals??'N/A'} / rejected ${candidate?.rawRejectedProposals??'N/A'}; evidence validity ${pct(candidate?.evidenceValidity)}. Deduplicated accepted findings and raw proposal counts differ; evidence-valid is not semantically correct.`,
`${packet.candidates.length} review candidates: eight original positives plus one supplemental positive and two negative controls. All PENDING_HUMAN_REVIEW; zero HUMAN_VERIFIED. Exact quote/context/official URL/hash/severity/rationale and uncertainty are in docs/gold-label-review.md and evaluation/p4.1/review-packet.json. Sparse references, assistant draft reviews and exposed development data limit generalization; no untouched holdout or legal-expert review claim.`,
'## Security and actual browser',
`Twelve preserved injection scenarios: ${security?.status??'BLOCKED'}. Runtime failures: ${security?.runtimeFailures.join(', ')||'none / see pending status'}. Actual DOM task failures: ${security?.agentTaskFailures.join(', ')||'none / see pending status'}. Semantic suppression: ${security?.semanticSuppression.join(', ')||'none / see pending status'}. Attack/legal native coexposure: ${co?.status??'BLOCKED'}.`,
'Actual official Alibaba activity, tools and permitted DOM opening are recorded; malicious instructions are text, never executable test payloads. A hidden instruction excluded from extraction is not by itself model-defense proof: paired native probes expose both payload and genuine renewal. Runtime prevention and legal-risk detection are separate. P0.1 grammar/official normalizer, ISOLATED content scripts, trusted Service Worker requests, loopback-only provider and restricted DOM tools remain intact. No MAIN proxy, arbitrary forwarding, experimental script execution, credentials or dangerous tool added. Controlled tests neither prove universal injection immunity nor certify Windows clean.',
`Typecheck/Vitest/build exits: ${JSON.stringify(build)}; 147 unit tests in final-unit.log.`,
...(browser?.map(r=>`- ${r.script}: exit ${r.exitCode}.`)??['- Full automated suite: BLOCKED.']),
'Automated cached Chromium MV3 validation is distinct from **BLOCKED/outstanding manual branded Chrome toolbar verification**. No manual pass claimed.',
'## Performance and GPU',
'Existing RTX 4060 Laptop (8188 MiB), driver 596.49, previously measured RAM 31.75 GiB; Ollama 0.40.0, qwen3.5:9b-q4_K_M, 8192 context, flash attention/q8_0 KV, one model/sequence. No new model/version/quantization or 4096/16384 substitution.',
`Measured scope: ${performance?.scope??'N/A'}. Fresh/replayed calls ${performance?.freshCalls??'N/A'}/${performance?.replayedCalls??'N/A'}; summed document processing ${durationMs==null?'N/A':(durationMs/60000).toFixed(3)+' min'}; prompt/generated tokens ${prompt}/${generated}; generation ${performance?.tokensPerSecond?.toFixed(3)??'N/A'} tokens/s; summed warm load durations ${loadMs.toFixed(3)} ms. Empty-prompt preparation is separate; no cold-load timing claimed. Final full-evaluation duration/calls/speed: **BLOCKED / not measured**.`,
`Independent longitudinal pilot NVIDIA/CLI/API: ${run?.gpu.samples??'N/A'} loaded samples, fullGPU=${run?.gpu.fullGpu??'N/A'}, peak VRAM ${run?.gpu.peakVramMiB??'N/A'} MiB and compute ${run?.gpu.peakCompute??'N/A'}%. Targeted independent samples ${targeted?.gpu.samples??'N/A'}, full residency ${targeted?.gpu.fullResidency??'N/A'}, peak ${targeted?.gpu.peakVramMiB??'N/A'} MiB/${targeted?.gpu.peakCompute??'N/A'}%. CPU/mixed execution refused. Raw native/GPU journals retain timings and processor/residency evidence.`,
'## Acceptance gates',
'| Gate | Result |\n|---|---|',
...Object.entries(gates).map(([k,v])=>`| ${k} | ${v} |`),
'A source-based original adjudication; B wider semantic test failures; C output cause diagnosed but only short candidate measurements; D strict evidence; E twelve runtime/semantic attacks; F final full comparison blocked by Stage D prerequisite; G independent GPU; H automated regression; I documentation. A completed audit report does not mean the candidate passed every gate.',
'## Files and reproduction',
'Production changes: src/risk/prompt.ts, categories.ts (guidance only), batching.ts, provider.ts, evidence.ts. Supporting changes: tests/unit/risk.test.ts, evidence-p4-1.test.ts; scripts/test-p3-browser.mjs, eval-real.mjs, eval-metrics.mjs, test-p4-semantics.mjs, test-p4-security.mjs; new P4.1 targeted/safe/evaluation/adjudication/coexposure/review/report helpers and package scripts. No dependencies added. Documentation and versioned evaluation/evidence artifacts are listed in files-manifest.json. Protected hashes confirm scoring, schema, extraction, UI, grammar and agent implementation preservation.',
'Exact PowerShell scoped reproduction commands are in README P4.1. Reuse the installed runtime/model/snapshots: npm run ollama:start; npm test; npm run typecheck; npm run build. Run targeted, semantic and safe checks serially, then security/coexposure and npm run test:browser. node scripts/eval-p4-1.mjs --fresh --selected reproduces the diagnostic pilot. Independently review its fresh fingerprints, set candidate metric environment variables and run eval-metrics.mjs. Do not run the full --fresh evaluation as accepted final evidence until the smaller semantic gate is resolved. Cache cannot validate a changed prompt.',
'Next recommended work: resolve false unresolvedIssues and missed/unsupported category explanations on the existing model, validate the short gates, run one final frozen five-source evaluation, obtain actual human annotation review, then manual Chrome toolbar checks. No later phase is implemented. Bu uygulama hukuki tavsiye vermez.'
];
fs.writeFileSync('docs/p4.1-verification.md',lines.join('\n\n')+'\n');
fs.writeFileSync(base+'final-summary.json',JSON.stringify(core,null,2));
fs.writeFileSync('evaluation/p4.1/comparison.json',JSON.stringify({provisional:true,referenceSha256:reviewSha,versions:rows.map(([version,m,scope])=>({version,scope,metrics:m?.micro??null})),candidateConfig:pilot?.config,finalStageDecision:decision},null,2));
console.log(JSON.stringify({status:core.status,gates,metrics:core.candidate}));
